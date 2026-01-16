import { OpenCodeClient } from "../opencode";
import { ContextSnapshot } from "./ContextSnapshot";

export interface ContextInjectorConfig {
  rateLimitMs: number;
}

const DEFAULT_CONFIG: ContextInjectorConfig = {
  rateLimitMs: 2000,
};

const CONTEXT_HEADER = "[OBSIDIAN_CONTEXT v1]";

export class ContextInjector {
  private client: OpenCodeClient;
  private config: ContextInjectorConfig;
  private lastInjectionTime: number = 0;
  private pendingInjection: ContextSnapshot | null = null;
  private pendingSessionId: string | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(client: OpenCodeClient, config: Partial<ContextInjectorConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async inject(sessionId: string, snapshot: ContextSnapshot): Promise<boolean> {
    const now = Date.now();
    const timeSinceLastInjection = now - this.lastInjectionTime;

    if (timeSinceLastInjection < this.config.rateLimitMs) {
      this.schedulePendingInjection(sessionId, snapshot, this.config.rateLimitMs - timeSinceLastInjection);
      return false;
    }

    return this.doInject(sessionId, snapshot);
  }

  cancelPending(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pendingInjection = null;
    this.pendingSessionId = null;
  }

  private schedulePendingInjection(sessionId: string, snapshot: ContextSnapshot, delayMs: number): void {
    this.cancelPending();
    this.pendingInjection = snapshot;
    this.pendingSessionId = sessionId;

    this.timeoutId = setTimeout(async () => {
      this.timeoutId = null;
      if (this.pendingInjection && this.pendingSessionId) {
        const snap = this.pendingInjection;
        const sid = this.pendingSessionId;
        this.pendingInjection = null;
        this.pendingSessionId = null;
        await this.doInject(sid, snap);
      }
    }, delayMs);
  }

  private async doInject(sessionId: string, snapshot: ContextSnapshot): Promise<boolean> {
    const contextText = this.formatContext(snapshot);

    try {
      console.log("[ContextInjector] Injecting context:", contextText);
      await this.client.promptNoReply(sessionId, contextText);
      this.lastInjectionTime = Date.now();
      console.log("[ContextInjector] Context injection successful");
      return true;
    } catch (err) {
      console.error("[ContextInjector] Injection failed:", err);
      return false;
    }
  }

  private formatContext(snapshot: ContextSnapshot): string {
    const lines: string[] = [CONTEXT_HEADER];

    if (snapshot.activeFile) {
      lines.push(`Active file: ${snapshot.activeFile}`);
    }

    if (snapshot.cursorPosition) {
      lines.push(`Cursor: line ${snapshot.cursorPosition.line + 1}, col ${snapshot.cursorPosition.ch + 1}`);
    }

    if (snapshot.selection) {
      const truncated = snapshot.selection.length > 500
        ? snapshot.selection.slice(0, 500) + "... (truncated)"
        : snapshot.selection;
      lines.push(`Selection:\n\`\`\`\n${truncated}\n\`\`\``);
    }

    if (snapshot.openTabs.length > 0) {
      lines.push(`Open tabs (${snapshot.openTabs.length}):`);
      for (const tab of snapshot.openTabs.slice(0, 10)) {
        lines.push(`  - ${tab}`);
      }
      if (snapshot.openTabs.length > 10) {
        lines.push(`  ... and ${snapshot.openTabs.length - 10} more`);
      }
    }

    return lines.join("\n");
  }
}
