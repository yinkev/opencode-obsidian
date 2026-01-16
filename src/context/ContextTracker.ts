import { App, TFile, MarkdownView, WorkspaceLeaf } from "obsidian";
import { ContextSnapshot, createEmptySnapshot, snapshotsEqual } from "./ContextSnapshot";
import { debounce, DebouncedFunction } from "../util/debounce";

export type ContextChangeHandler = (snapshot: ContextSnapshot) => void;

export interface ContextTrackerConfig {
  debounceMs: number;
}

const DEFAULT_CONFIG: ContextTrackerConfig = {
  debounceMs: 300,
};

export class ContextTracker {
  private app: App;
  private config: ContextTrackerConfig;
  private lastSnapshot: ContextSnapshot;
  private handlers: Set<ContextChangeHandler> = new Set();
  private debouncedEmit: DebouncedFunction<[]>;
  private unsubscribers: (() => void)[] = [];

  constructor(app: App, config: Partial<ContextTrackerConfig> = {}) {
    this.app = app;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastSnapshot = createEmptySnapshot();
    this.debouncedEmit = debounce(() => this.emitIfChanged(), this.config.debounceMs);
  }

  start(): void {
    this.registerEvents();
    this.captureAndEmit();
  }

  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.debouncedEmit.cancel();
  }

  onContextChange(handler: ContextChangeHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  getSnapshot(): ContextSnapshot {
    return this.captureSnapshot();
  }

  private registerEvents(): void {
    const workspace = this.app.workspace;

    const onActiveLeafChange = workspace.on("active-leaf-change", () => {
      this.debouncedEmit();
    });
    this.unsubscribers.push(() => workspace.offref(onActiveLeafChange));

    const onFileOpen = workspace.on("file-open", () => {
      this.debouncedEmit();
    });
    this.unsubscribers.push(() => workspace.offref(onFileOpen));

    const onLayoutChange = workspace.on("layout-change", () => {
      this.debouncedEmit();
    });
    this.unsubscribers.push(() => workspace.offref(onLayoutChange));

    const onEditorChange = workspace.on("editor-change", () => {
      this.debouncedEmit();
    });
    this.unsubscribers.push(() => workspace.offref(onEditorChange));
  }

  private captureSnapshot(): ContextSnapshot {
    const activeFile = this.app.workspace.getActiveFile();
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

    let selection: string | null = null;
    let cursorPosition: { line: number; ch: number } | null = null;

    if (activeView?.editor) {
      const editor = activeView.editor;
      const selectedText = editor.getSelection();
      if (selectedText) {
        selection = selectedText;
      }
      const cursor = editor.getCursor();
      cursorPosition = { line: cursor.line, ch: cursor.ch };
    }

    const openTabs = this.getOpenTabs();

    return {
      activeFile: activeFile?.path ?? null,
      selection,
      openTabs,
      cursorPosition,
      timestamp: Date.now(),
    };
  }

  private getOpenTabs(): string[] {
    const paths: string[] = [];
    const seen = new Set<string>();

    this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      const viewState = leaf.getViewState();
      if (viewState.type === "markdown" && viewState.state?.file) {
        const filePath = viewState.state.file as string;
        if (!seen.has(filePath)) {
          seen.add(filePath);
          paths.push(filePath);
        }
      }
    });

    return paths;
  }

  private captureAndEmit(): void {
    const snapshot = this.captureSnapshot();
    this.lastSnapshot = snapshot;
    this.emit(snapshot);
  }

  private emitIfChanged(): void {
    const snapshot = this.captureSnapshot();
    if (!snapshotsEqual(snapshot, this.lastSnapshot)) {
      this.lastSnapshot = snapshot;
      this.emit(snapshot);
    }
  }

  private emit(snapshot: ContextSnapshot): void {
    for (const handler of this.handlers) {
      try {
        handler(snapshot);
      } catch (err) {
        console.error("[ContextTracker] Handler error:", err);
      }
    }
  }
}
