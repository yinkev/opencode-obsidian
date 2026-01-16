export interface CursorPosition {
  line: number;
  ch: number;
}

export interface ContextSnapshot {
  activeFile: string | null;
  selection: string | null;
  openTabs: string[];
  cursorPosition: CursorPosition | null;
  timestamp: number;
}

export function createEmptySnapshot(): ContextSnapshot {
  return {
    activeFile: null,
    selection: null,
    openTabs: [],
    cursorPosition: null,
    timestamp: Date.now(),
  };
}

export function snapshotsEqual(a: ContextSnapshot, b: ContextSnapshot): boolean {
  if (a.activeFile !== b.activeFile) return false;
  if (a.selection !== b.selection) return false;
  if (a.openTabs.length !== b.openTabs.length) return false;
  for (let i = 0; i < a.openTabs.length; i++) {
    if (a.openTabs[i] !== b.openTabs[i]) return false;
  }
  if (a.cursorPosition?.line !== b.cursorPosition?.line) return false;
  if (a.cursorPosition?.ch !== b.cursorPosition?.ch) return false;
  return true;
}
