import { spawn, ChildProcess } from "child_process";
import { ServerConfig, ServerState, DEFAULT_CORS_ORIGINS } from "./types";
import { findFreePort } from "./PortFinder";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

export class ServerManager {
  private process: ChildProcess | null = null;
  private state: ServerState = "stopped";
  private lastError: string | null = null;
  private earlyExitCode: number | null = null;
  private config: ServerConfig;
  private actualPort: number | null = null;
  private onStateChange: (state: ServerState) => void;

  constructor(config: ServerConfig, onStateChange: (state: ServerState) => void) {
    this.config = config;
    this.onStateChange = onStateChange;
  }

  updateConfig(config: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getState(): ServerState {
    return this.state;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getPort(): number | null {
    return this.actualPort;
  }

  getUrl(): string | null {
    if (!this.actualPort) return null;
    const encodedPath = btoa(this.config.projectDirectory);
    return `http://${this.config.hostname}:${this.actualPort}/${encodedPath}`;
  }

  async start(): Promise<boolean> {
    if (this.state === "running" || this.state === "starting") {
      return true;
    }

    this.setState("starting");
    this.lastError = null;
    this.earlyExitCode = null;

    if (!this.config.projectDirectory) {
      return this.setError("Project directory not configured");
    }

    // Find a free port if requested port is in use
    try {
      this.actualPort = await findFreePort(this.config.port);
    } catch (err) {
      return this.setError(`Failed to find free port: ${err}`);
    }

    // Check if server already running on this port
    if (await this.checkServerHealth()) {
      console.log("[ServerManager] Server already running on port", this.actualPort);
      this.setState("running");
      return true;
    }

    const args = this.buildArgs();
    const env = this.buildEnv();

    console.log("[ServerManager] Starting server:", {
      opencodePath: this.config.opencodePath,
      port: this.actualPort,
      hostname: this.config.hostname,
      cwd: this.config.projectDirectory,
      corsOrigins: this.config.corsOrigins,
    });

    this.process = spawn(this.config.opencodePath, args, {
      cwd: this.config.projectDirectory,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    console.log("[ServerManager] Process spawned with PID:", this.process.pid);

    this.process.stdout?.on("data", (data) => {
      console.log("[ServerManager]", data.toString().trim());
    });

    this.process.stderr?.on("data", (data) => {
      console.error("[ServerManager Error]", data.toString().trim());
    });

    this.process.on("exit", (code, signal) => {
      console.log(`[ServerManager] Process exited with code ${code}, signal ${signal}`);
      this.process = null;

      if (this.state === "starting" && code !== null && code !== 0) {
        this.earlyExitCode = code;
      }

      if (this.state === "running") {
        this.setState("stopped");
      }
    });

    this.process.on("error", (err: NodeJS.ErrnoException) => {
      console.error("[ServerManager] Failed to start process:", err);
      this.process = null;

      if (err.code === "ENOENT") {
        this.setError(`Executable not found at '${this.config.opencodePath}'`);
      } else {
        this.setError(`Failed to start: ${err.message}`);
      }
    });

    const ready = await this.waitForServerOrExit(this.config.startupTimeout);
    if (ready) {
      this.setState("running");
      return true;
    }

    if (this.state === "error") {
      return false;
    }

    this.stop();
    if (this.earlyExitCode !== null) {
      return this.setError(`Process exited unexpectedly (exit code ${this.earlyExitCode})`);
    }
    if (!this.process) {
      return this.setError("Process exited before server became ready");
    }
    return this.setError("Server failed to start within timeout");
  }

  stop(): void {
    if (!this.process) {
      this.setState("stopped");
      this.actualPort = null;
      return;
    }

    const proc = this.process;
    console.log("[ServerManager] Stopping process with PID:", proc.pid);

    this.setState("stopped");
    this.process = null;
    this.actualPort = null;

    proc.kill("SIGTERM");

    // Force kill after 2 seconds if still running
    setTimeout(() => {
      if (proc.exitCode === null && proc.signalCode === null) {
        console.log("[ServerManager] Process still running, sending SIGKILL");
        proc.kill("SIGKILL");
      }
    }, 2000);
  }

  private buildArgs(): string[] {
    const args = [
      "serve",
      "--port",
      this.actualPort!.toString(),
      "--hostname",
      this.config.hostname,
    ];

    // Add CORS origins (repeated --cors flags)
    const origins = this.config.corsOrigins.length > 0
      ? this.config.corsOrigins
      : DEFAULT_CORS_ORIGINS;

    for (const origin of origins) {
      args.push("--cors", origin);
    }

    return args;
  }

  private buildEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };

    // Isolate plugin from user's existing OpenCode config
    const pluginConfigDir = path.join(os.homedir(), '.config', 'opencode-plugin');
    env.OPENCODE_CONFIG_DIR = pluginConfigDir;

    // Ensure plugin config directory exists
    if (!fs.existsSync(pluginConfigDir)) {
      fs.mkdirSync(pluginConfigDir, { recursive: true });
    }

    // Optional basic auth via env vars
    if (this.config.basicAuth) {
      env.OPENCODE_BASIC_AUTH_USER = this.config.basicAuth.username;
      env.OPENCODE_BASIC_AUTH_PASS = this.config.basicAuth.password;
      // Also set the server password that opencode expects
      env.OPENCODE_SERVER_PASSWORD = this.config.basicAuth.password;
    }

    return env;
  }

  private setState(state: ServerState): void {
    this.state = state;
    this.onStateChange(state);
  }

  private setError(message: string): false {
    this.lastError = message;
    console.error("[ServerManager Error]", message);
    this.setState("error");
    return false;
  }

  private async checkServerHealth(): Promise<boolean> {
    const url = this.getUrl();
    if (!url) return false;

    try {
      const response = await fetch(`${url}/global/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async waitForServerOrExit(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < timeoutMs) {
      if (!this.process) {
        console.log("[ServerManager] Process exited before server became ready");
        return false;
      }

      if (await this.checkServerHealth()) {
        return true;
      }
      await this.sleep(pollInterval);
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
