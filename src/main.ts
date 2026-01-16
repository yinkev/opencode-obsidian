import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from "obsidian";
import { OpenCodeSettings, DEFAULT_SETTINGS, OPENCODE_VIEW_TYPE } from "./types";
import { OpenWorkView } from "./view";
import { OpenCodeSettingTab } from "./SettingsTab";
import { ServerManager, OpenCodeClient, ServerState } from "./opencode";
import { registerOpenCodeIcons, OPENCODE_ICON_NAME } from "./icons";
import { ContextTracker, ContextInjector } from "./context";

export default class OpenCodePlugin extends Plugin {
  settings: OpenCodeSettings = DEFAULT_SETTINGS;
  private serverManager: ServerManager;
  private contextTracker: ContextTracker;
  private contextInjector: ContextInjector;
  private openCodeClient: OpenCodeClient;
  private stateChangeCallbacks: Array<(state: ServerState) => void> = [];

  async onload(): Promise<void> {
    await this.loadSettings();

    const projectDirectory = this.getProjectDirectory();

    // Initialize server manager
    this.serverManager = new ServerManager(
      {
        port: this.settings.port,
        hostname: this.settings.hostname,
        opencodePath: this.settings.opencodePath,
        projectDirectory,
        startupTimeout: this.settings.startupTimeout,
        corsOrigins: ["app://obsidian.md"],
      },
      (state: ServerState) => this.notifyStateChange(state)
    );

    // Initialize OpenCode client
    this.openCodeClient = new OpenCodeClient({
      baseUrl: this.serverManager.getUrl() || "",
    });

    // Initialize context tracking and injection
    this.contextTracker = new ContextTracker(this.app);
    this.contextInjector = new ContextInjector(this.openCodeClient);

    console.log("[OpenCode] Configured with project directory:", projectDirectory);

    this.registerView(OPENCODE_VIEW_TYPE, (leaf) => new OpenWorkView(leaf, this));

    this.addRibbonIcon(OPENCODE_ICON_NAME, "OpenCode", () => {
      this.activateView();
    });

    this.addCommand({
      id: "toggle-view",
      name: "Toggle OpenCode panel",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "start-server",
      name: "Start OpenCode server",
      callback: () => this.startServer(),
    });

    this.addCommand({
      id: "stop-server",
      name: "Stop OpenCode server",
      callback: () => this.stopServer(),
    });

    this.addSettingTab(new OpenCodeSettingTab(this.app, this));
    registerOpenCodeIcons();

    console.log("[OpenCode] Plugin loaded");
  }

  async onunload(): Promise<void> {
    // Properly clean up all resources when plugin unloads
    this.contextTracker.stop();
    this.stopServer();
    this.app.workspace.detachLeavesOfType(OPENCODE_VIEW_TYPE);
  }

  onProcessStateChange(callback: (state: "stopped" | "starting" | "running" | "error") => void): () => void {
    this.stateChangeCallbacks.push(callback as (state: ServerState) => void);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback as (state: ServerState) => void);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStateChange(state: ServerState): void {
    this.stateChangeCallbacks.forEach(callback => callback(state));
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(OPENCODE_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({
        type: OPENCODE_VIEW_TYPE,
        active: true,
      });
    }
    workspace.revealLeaf(leaf);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.serverManager.updateConfig({
      port: this.settings.port,
      hostname: this.settings.hostname,
      opencodePath: this.settings.opencodePath,
      startupTimeout: this.settings.startupTimeout,
    });
  }

  async startServer(): Promise<boolean> {
    const success = await this.serverManager.start();
    if (success) {
      // Update client with new URL and start context tracking
      this.openCodeClient.updateConfig({
        baseUrl: this.serverManager.getUrl() || "",
      });
      this.contextTracker.start();
    }
    return success;
  }

  stopServer(): void {
    this.contextTracker.stop();
    this.serverManager.stop();
  }

  getProcessState(): "stopped" | "starting" | "running" | "error" {
    const state = this.serverManager.getState();
    switch (state) {
      case "stopped": return "stopped";
      case "starting": return "starting";
      case "running": return "running";
      case "error": return "error";
      default: return "stopped";
    }
  }

  getLastError(): string | null {
    return this.serverManager.getLastError();
  }

  getServerUrl(): string {
    return this.serverManager.getUrl() || "";
  }

  getContextTracker(): ContextTracker {
    return this.contextTracker;
  }

  getContextInjector(): ContextInjector {
    return this.contextInjector;
  }

  getOpenCodeClient(): OpenCodeClient {
    return this.openCodeClient;
  }

  async updateProjectDirectory(directory: string): Promise<void> {
    this.settings.projectDirectory = directory;
    await this.saveData(this.settings);

    this.serverManager.updateConfig({
      projectDirectory: this.getProjectDirectory(),
    });

    if (this.getProcessState() === "running") {
      this.stopServer();
      await this.startServer();
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  private getProjectDirectory(): string {
    return this.settings.projectDirectory || (this.app.vault.adapter as any).basePath;
  }
}