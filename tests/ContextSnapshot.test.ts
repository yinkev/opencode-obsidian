import { describe, test, expect } from "bun:test";
import { createEmptySnapshot, snapshotsEqual } from "../src/context/ContextSnapshot";
import type { ContextSnapshot } from "../src/context/ContextSnapshot";

describe("ContextSnapshot", () => {
  test("createEmptySnapshot returns valid empty snapshot", () => {
    const snapshot = createEmptySnapshot();
    expect(snapshot.activeFile).toBe(null);
    expect(snapshot.selection).toBe(null);
    expect(snapshot.openTabs).toEqual([]);
    expect(snapshot.cursorPosition).toBe(null);
    expect(typeof snapshot.timestamp).toBe("number");
  });

  test("snapshotsEqual returns true for identical snapshots", () => {
    const a: ContextSnapshot = {
      activeFile: "test.md",
      selection: "hello",
      openTabs: ["test.md", "other.md"],
      cursorPosition: { line: 5, ch: 10 },
      timestamp: 1000,
    };
    const b: ContextSnapshot = {
      activeFile: "test.md",
      selection: "hello",
      openTabs: ["test.md", "other.md"],
      cursorPosition: { line: 5, ch: 10 },
      timestamp: 2000,
    };
    expect(snapshotsEqual(a, b)).toBe(true);
  });

  test("snapshotsEqual returns false for different activeFile", () => {
    const a: ContextSnapshot = {
      activeFile: "a.md",
      selection: null,
      openTabs: [],
      cursorPosition: null,
      timestamp: 1000,
    };
    const b: ContextSnapshot = {
      activeFile: "b.md",
      selection: null,
      openTabs: [],
      cursorPosition: null,
      timestamp: 1000,
    };
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  test("snapshotsEqual returns false for different selection", () => {
    const a: ContextSnapshot = {
      activeFile: "test.md",
      selection: "hello",
      openTabs: [],
      cursorPosition: null,
      timestamp: 1000,
    };
    const b: ContextSnapshot = {
      activeFile: "test.md",
      selection: "world",
      openTabs: [],
      cursorPosition: null,
      timestamp: 1000,
    };
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  test("snapshotsEqual returns false for different openTabs", () => {
    const a: ContextSnapshot = {
      activeFile: null,
      selection: null,
      openTabs: ["a.md"],
      cursorPosition: null,
      timestamp: 1000,
    };
    const b: ContextSnapshot = {
      activeFile: null,
      selection: null,
      openTabs: ["a.md", "b.md"],
      cursorPosition: null,
      timestamp: 1000,
    };
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  test("snapshotsEqual returns false for different cursor position", () => {
    const a: ContextSnapshot = {
      activeFile: null,
      selection: null,
      openTabs: [],
      cursorPosition: { line: 1, ch: 1 },
      timestamp: 1000,
    };
    const b: ContextSnapshot = {
      activeFile: null,
      selection: null,
      openTabs: [],
      cursorPosition: { line: 2, ch: 1 },
      timestamp: 1000,
    };
    expect(snapshotsEqual(a, b)).toBe(false);
  });
});
