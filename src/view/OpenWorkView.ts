import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { OPENCODE_VIEW_TYPE } from "../types";
import { OPENCODE_ICON_NAME } from "../icons";
import type OpenCodePlugin from "../main";
import { ProcessState } from "../ProcessManager";
import {
  BridgeHost,
  BridgeInitPayload,
  UIToPluginMessageType,
} from "../bridge";
import { DEV_CORS_ORIGIN } from "../opencode";

const ALLOWED_ORIGINS = ["app://obsidian.md"];

export class OpenWorkView extends ItemView {
  plugin: OpenCodePlugin;
  private iframeEl: HTMLIFrameElement | null = null;
  private currentState: ProcessState = "stopped";
  private unsubscribeStateChange: (() => void) | null = null;
  private bridgeHost: BridgeHost | null = null;
  private uiReady = false;
  private activeSessionId: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: OpenCodePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return OPENCODE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "OpenCode";
  }

  getIcon(): string {
    return OPENCODE_ICON_NAME;
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("opencode-container");

    this.unsubscribeStateChange = this.plugin.onProcessStateChange((state) => {
      this.currentState = state;
      this.updateView();
    });

    this.currentState = this.plugin.getProcessState();
    this.updateView();

    if (this.currentState === "stopped") {
      this.plugin.startServer();
    }
  }

  async onClose(): Promise<void> {
    if (this.unsubscribeStateChange) {
      this.unsubscribeStateChange();
      this.unsubscribeStateChange = null;
    }

    if (this.bridgeHost) {
      this.bridgeHost.detach();
      this.bridgeHost = null;
    }

    if (this.iframeEl) {
      this.iframeEl.src = "about:blank";
      this.iframeEl = null;
    }

    this.uiReady = false;
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  private updateView(): void {
    switch (this.currentState) {
      case "stopped":
        this.renderStoppedState();
        break;
      case "starting":
        this.renderStartingState();
        break;
      case "running":
        this.renderRunningState();
        break;
      case "error":
        this.renderErrorState();
        break;
    }
  }

  private renderStoppedState(): void {
    this.contentEl.empty();
    this.uiReady = false;

    const statusContainer = this.contentEl.createDiv({
      cls: "opencode-status-container",
    });

    const iconEl = statusContainer.createDiv({ cls: "opencode-status-icon" });
    setIcon(iconEl, "power-off");

    statusContainer.createEl("h3", { text: "OpenCode is stopped" });
    statusContainer.createEl("p", {
      text: "Click the button below to start the OpenCode server.",
      cls: "opencode-status-message",
    });

    const startButton = statusContainer.createEl("button", {
      text: "Start OpenCode",
      cls: "mod-cta",
    });
    startButton.addEventListener("click", () => {
      this.plugin.startServer();
    });
  }

  private renderStartingState(): void {
    this.contentEl.empty();
    this.uiReady = false;

    const statusContainer = this.contentEl.createDiv({
      cls: "opencode-status-container",
    });

    const loadingEl = statusContainer.createDiv({ cls: "opencode-loading" });
    loadingEl.createDiv({ cls: "opencode-spinner" });

    statusContainer.createEl("h3", { text: "Starting OpenCode..." });
    statusContainer.createEl("p", {
      text: "Please wait while the server starts up.",
      cls: "opencode-status-message",
    });
  }

  private renderRunningState(): void {
    this.contentEl.empty();

    const headerEl = this.contentEl.createDiv({ cls: "opencode-header" });

    const titleSection = headerEl.createDiv({ cls: "opencode-header-title" });
    const iconEl = titleSection.createSpan();
    setIcon(iconEl, OPENCODE_ICON_NAME);
    titleSection.createSpan({ text: "OpenCode" });

    const actionsEl = headerEl.createDiv({ cls: "opencode-header-actions" });

    const reloadButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Reload" },
    });
    setIcon(reloadButton, "refresh-cw");
    reloadButton.addEventListener("click", () => {
      this.reloadIframe();
    });

    const stopButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Stop server" },
    });
    setIcon(stopButton, "square");
    stopButton.addEventListener("click", () => {
      this.plugin.stopServer();
    });

    const iframeContainer = this.contentEl.createDiv({
      cls: "opencode-iframe-container",
    });

    const serverUrl = this.plugin.getServerUrl();
    console.log("[OpenWorkView] Loading iframe with URL:", serverUrl);

    this.iframeEl = iframeContainer.createEl("iframe", {
      cls: "opencode-iframe",
      attr: {
        src: serverUrl,
        frameborder: "0",
        allow: "clipboard-read; clipboard-write",
      },
    });

    this.iframeEl.addEventListener("load", () => {
      this.initBridge();
    });

    this.iframeEl.addEventListener("error", () => {
      console.error("[OpenWorkView] Failed to load iframe");
    });
  }

  private renderErrorState(): void {
    this.contentEl.empty();
    this.uiReady = false;

    const statusContainer = this.contentEl.createDiv({
      cls: "opencode-status-container opencode-error",
    });

    const iconEl = statusContainer.createDiv({ cls: "opencode-status-icon" });
    setIcon(iconEl, "alert-circle");

    statusContainer.createEl("h3", { text: "Failed to start OpenCode" });

    const errorMessage = this.plugin.getLastError();
    if (errorMessage) {
      statusContainer.createEl("p", {
        text: errorMessage,
        cls: "opencode-status-message opencode-error-message",
      });
    } else {
      statusContainer.createEl("p", {
        text: "There was an error starting the OpenCode server.",
        cls: "opencode-status-message",
      });
    }

    const buttonContainer = statusContainer.createDiv({
      cls: "opencode-button-group",
    });

    const retryButton = buttonContainer.createEl("button", {
      text: "Retry",
      cls: "mod-cta",
    });
    retryButton.addEventListener("click", () => {
      this.plugin.startServer();
    });

    const settingsButton = buttonContainer.createEl("button", {
      text: "Open Settings",
    });
    settingsButton.addEventListener("click", () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-opencode");
    });
  }

  private initBridge(): void {
    if (!this.iframeEl) return;

    const devMode = this.plugin.settings.devMode ?? false;
    const origins = devMode ? [...ALLOWED_ORIGINS, DEV_CORS_ORIGIN] : ALLOWED_ORIGINS;

    this.bridgeHost = new BridgeHost({
      allowedOrigins: origins,
      devMode,
    });

    this.bridgeHost.attach(this.iframeEl, this.handleBridgeMessage.bind(this));

    this.sendBridgeInit();
  }

  private sendBridgeInit(): void {
    if (!this.bridgeHost) return;

    const payload: BridgeInitPayload = {
      vaultName: this.app.vault.getName(),
      pluginVersion: this.plugin.manifest.version,
      serverUrl: this.plugin.getServerUrl(),
      devMode: this.plugin.settings.devMode,
    };

    this.bridgeHost.send("bridge/init", payload);
    console.log("[OpenWorkView] Sent bridge/init with channelId:", this.bridgeHost.getChannelId());
  }

  private handleBridgeMessage(
    type: UIToPluginMessageType,
    payload: unknown,
    _channelId: string
  ): void {
    console.log("[OpenWorkView] Received bridge message:", type, payload);

    switch (type) {
      case "ui/ready":
        this.uiReady = true;
        console.log("[OpenWorkView] UI ready, handshake complete");
        break;

      case "ui/session/selected":
        this.activeSessionId = (payload as { sessionId: string }).sessionId;
        console.log("[OpenWorkView] Active session:", this.activeSessionId);
        break;

      case "ui/requestContextNow":
        console.log("[OpenWorkView] Context requested for session:", (payload as any).sessionId);
        break;

      case "ui/vault/openFile":
        this.handleOpenFile(payload as { path: string; line?: number });
        break;

      case "ui/vault/createNote":
        this.handleCreateNote(payload as { path: string; content: string });
        break;

      case "ui/editor/insertText":
        this.handleInsertText(payload as { text: string; position?: string });
        break;

      case "ui/personality/set":
        console.log("[OpenWorkView] Personality set:", (payload as any).personalityId);
        break;

      case "ui/canvas/compileWorkflow":
        console.log("[OpenWorkView] Canvas compile requested:", (payload as any).canvasPath);
        break;
    }
  }

  private async handleOpenFile(payload: { path: string; line?: number }): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(payload.path);
    if (file) {
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file as any);
      if (payload.line !== undefined) {
        const view = leaf.view as any;
        if (view?.editor) {
          view.editor.setCursor({ line: payload.line, ch: 0 });
        }
      }
    }
  }

  private async handleCreateNote(payload: { path: string; content: string }): Promise<void> {
    await this.app.vault.create(payload.path, payload.content);
  }

  private handleInsertText(payload: { text: string; position?: string }): void {
    const activeView = this.app.workspace.getActiveViewOfType(ItemView);
    const editor = (activeView as any)?.editor;
    if (editor) {
      if (payload.position === "end") {
        const lastLine = editor.lastLine();
        editor.replaceRange(payload.text, { line: lastLine, ch: editor.getLine(lastLine).length });
      } else {
        editor.replaceSelection(payload.text);
      }
    }
  }

  private reloadIframe(): void {
    if (this.iframeEl) {
      const src = this.iframeEl.src;
      this.iframeEl.src = "about:blank";
      this.uiReady = false;
      setTimeout(() => {
        if (this.iframeEl) {
          this.iframeEl.src = src;
        }
      }, 100);
    }
  }
}
