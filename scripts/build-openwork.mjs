#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const VENDOR_DIR = resolve(import.meta.dirname, "../vendor/opencode");
const APP_DIR = resolve(VENDOR_DIR, "packages/app");

if (!existsSync(APP_DIR)) {
  console.error("Error: vendor/opencode/packages/app not found");
  console.error("Run: git submodule update --init --recursive");
  process.exit(1);
}

console.log("Installing dependencies...");
execSync("bun install", { cwd: VENDOR_DIR, stdio: "inherit" });

console.log("Building @opencode-ai/app...");
execSync("bun run --filter @opencode-ai/app build", {
  cwd: VENDOR_DIR,
  stdio: "inherit",
});

console.log("Build complete. Output: vendor/opencode/packages/app/dist/");
