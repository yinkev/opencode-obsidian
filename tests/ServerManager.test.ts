import { describe, test, expect, afterEach } from "bun:test";
import { ServerManager, ServerConfig, findFreePort, isPortAvailable } from "../src/opencode";

const TEST_TIMEOUT_MS = 20000;
const PROJECT_DIR = process.cwd();

let testPortCounter = 16000;
function getNextPort(): number {
  return testPortCounter++;
}

function createTestConfig(port: number): ServerConfig {
  return {
    port,
    hostname: "127.0.0.1",
    opencodePath: "opencode",
    projectDirectory: PROJECT_DIR,
    startupTimeout: 10000,
    corsOrigins: ["app://obsidian.md"],
  };
}

let currentManager: ServerManager | null = null;

afterEach(() => {
  if (currentManager) {
    currentManager.stop();
    currentManager = null;
  }
});

describe("PortFinder", () => {
  test("isPortAvailable returns true for unused port", async () => {
    const port = getNextPort();
    const available = await isPortAvailable(port);
    expect(available).toBe(true);
  });

  test("findFreePort returns available port", async () => {
    const startPort = getNextPort();
    const port = await findFreePort(startPort);
    expect(port).toBeGreaterThanOrEqual(startPort);
    const available = await isPortAvailable(port);
    expect(available).toBe(true);
  });
});

describe("ServerManager", () => {
  test("starts server and transitions to running state", async () => {
    const port = getNextPort();
    const config = createTestConfig(port);
    const stateHistory: string[] = [];

    currentManager = new ServerManager(config, (state) => stateHistory.push(state));

    expect(currentManager.getState()).toBe("stopped");

    const success = await currentManager.start();

    expect(success).toBe(true);
    expect(currentManager.getState()).toBe("running");
    expect(stateHistory).toContain("starting");
    expect(stateHistory).toContain("running");
    expect(currentManager.getPort()).toBeGreaterThanOrEqual(port);
  }, TEST_TIMEOUT_MS);

  test("stops server gracefully", async () => {
    const port = getNextPort();
    const config = createTestConfig(port);
    const stateHistory: string[] = [];

    currentManager = new ServerManager(config, (state) => stateHistory.push(state));

    await currentManager.start();
    expect(currentManager.getState()).toBe("running");

    currentManager.stop();

    expect(currentManager.getState()).toBe("stopped");
    expect(stateHistory).toContain("stopped");
  }, TEST_TIMEOUT_MS);

  test("getUrl returns correct URL when running", async () => {
    const port = getNextPort();
    const config = createTestConfig(port);

    currentManager = new ServerManager(config, () => {});

    expect(currentManager.getUrl()).toBe(null);

    await currentManager.start();

    const url = currentManager.getUrl();
    expect(url).not.toBe(null);
    expect(url).toContain("127.0.0.1");
    expect(url).toContain(btoa(PROJECT_DIR));
  }, TEST_TIMEOUT_MS);

  test("health check endpoint is accessible when running", async () => {
    const port = getNextPort();
    const config = createTestConfig(port);

    currentManager = new ServerManager(config, () => {});

    await currentManager.start();

    const url = currentManager.getUrl();
    const healthUrl = `${url}/global/health`;

    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(2000),
    });

    expect(response.ok).toBe(true);
  }, TEST_TIMEOUT_MS);

  test("finds free port when requested port is in use", async () => {
    const port = getNextPort();
    const config1 = createTestConfig(port);
    const config2 = createTestConfig(port);

    const manager1 = new ServerManager(config1, () => {});
    const manager2 = new ServerManager(config2, () => {});

    await manager1.start();
    expect(manager1.getPort()).toBe(port);

    await manager2.start();
    expect(manager2.getPort()).toBeGreaterThan(port);

    manager2.stop();
    manager1.stop();
  }, TEST_TIMEOUT_MS * 2);
});
