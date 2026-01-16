import { describe, test, expect, afterEach, beforeAll } from "bun:test";
import { OpenCodeClient, ServerManager, ServerConfig } from "../src/opencode";

const TEST_TIMEOUT_MS = 25000;
const PROJECT_DIR = process.cwd();

let testPortCounter = 17000;
function getNextPort(): number {
  return testPortCounter++;
}

function createTestServerConfig(port: number): ServerConfig {
  return {
    port,
    hostname: "127.0.0.1",
    opencodePath: "opencode",
    projectDirectory: PROJECT_DIR,
    startupTimeout: 15000,
    corsOrigins: ["app://obsidian.md"],
  };
}

let serverManager: ServerManager | null = null;
let client: OpenCodeClient | null = null;

afterEach(() => {
  if (serverManager) {
    serverManager.stop();
    serverManager = null;
  }
  client = null;
});

describe("OpenCodeClient", () => {
  test("healthCheck returns true when server is running", async () => {
    const port = getNextPort();
    const config = createTestServerConfig(port);
    serverManager = new ServerManager(config, () => {});
    await serverManager.start();

    const baseUrl = serverManager.getUrl()!;
    client = new OpenCodeClient({ baseUrl });

    const healthy = await client.healthCheck();
    expect(healthy).toBe(true);
  }, TEST_TIMEOUT_MS);

  test("healthCheck returns false when server is not running", async () => {
    client = new OpenCodeClient({ baseUrl: "http://127.0.0.1:19999/nonexistent" });

    const healthy = await client.healthCheck();
    expect(healthy).toBe(false);
  }, TEST_TIMEOUT_MS);

  test("listSessions returns array", async () => {
    const port = getNextPort();
    const config = createTestServerConfig(port);
    serverManager = new ServerManager(config, () => {});
    await serverManager.start();

    const baseUrl = serverManager.getUrl()!;
    client = new OpenCodeClient({ baseUrl });

    const sessions = await client.listSessions();
    expect(Array.isArray(sessions)).toBe(true);
  }, TEST_TIMEOUT_MS);
});
