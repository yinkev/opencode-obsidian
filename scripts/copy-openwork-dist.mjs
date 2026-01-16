#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";

const DIST_DIR = resolve(
  import.meta.dirname,
  "../vendor/opencode/packages/app/dist"
);
const TARGET_DIR = resolve(import.meta.dirname, "../assets/openwork");

if (!existsSync(DIST_DIR)) {
  console.error("Error: vendor/opencode/packages/app/dist not found");
  console.error("Run: node scripts/build-openwork.mjs first");
  process.exit(1);
}

if (existsSync(TARGET_DIR)) {
  rmSync(TARGET_DIR, { recursive: true });
}
mkdirSync(TARGET_DIR, { recursive: true });

cpSync(DIST_DIR, TARGET_DIR, { recursive: true });

const indexPath = resolve(TARGET_DIR, "index.html");
if (!existsSync(indexPath)) {
  console.error("Error: assets/openwork/index.html not created");
  process.exit(1);
}

console.log("Copied to assets/openwork/");
console.log("Verified: assets/openwork/index.html exists");
