import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { OPENCODE_VIEW_TYPE } from "./types";
import type OpenCodePlugin from "./main";
import { ProcessState } from "./ProcessManager";

export class OpenCodeView extends ItemView {
  plugin: OpenCodePlugin;
  private iframeEl: HTMLIFrameElement | null = null;
  private currentState: ProcessState = "stopped";

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
    return "terminal";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("opencode-container");

    // Subscribe to state changes
    this.plugin.onProcessStateChange((state) => {
      this.currentState = state;
      this.updateView();
    });

    // Initial render
    this.currentState = this.plugin.getProcessState();
    this.updateView();

    // Start server if not running (lazy start) - don't await to avoid blocking view open
    if (this.currentState === "stopped") {
      this.plugin.startServer();
    }
  }

  async onClose(): Promise<void> {
    // Clean up iframe
    if (this.iframeEl) {
      this.iframeEl.src = "about:blank";
      this.iframeEl = null;
    }
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

    // Create header with controls
    const headerEl = this.contentEl.createDiv({ cls: "opencode-header" });

    const titleSection = headerEl.createDiv({ cls: "opencode-header-title" });
    const iconEl = titleSection.createSpan();
    setIcon(iconEl, "terminal");
    titleSection.createSpan({ text: "OpenCode" });

    const actionsEl = headerEl.createDiv({ cls: "opencode-header-actions" });

    // Reload button
    const reloadButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Reload" },
    });
    setIcon(reloadButton, "refresh-cw");
    reloadButton.addEventListener("click", () => {
      this.reloadIframe();
    });

    // Open in browser button
    const externalButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Open in browser" },
    });
    setIcon(externalButton, "external-link");
    externalButton.addEventListener("click", () => {
      window.open(this.plugin.getServerUrl(), "_blank");
    });

    // Stop button
    const stopButton = actionsEl.createEl("button", {
      attr: { "aria-label": "Stop server" },
    });
    setIcon(stopButton, "square");
    stopButton.addEventListener("click", () => {
      this.plugin.stopServer();
    });

    // Create iframe container
    const iframeContainer = this.contentEl.createDiv({
      cls: "opencode-iframe-container",
    });

    this.iframeEl = iframeContainer.createEl("iframe", {
      cls: "opencode-iframe",
      attr: {
        src: this.plugin.getServerUrl(),
        frameborder: "0",
        allow: "clipboard-read; clipboard-write",
      },
    });

    // Handle iframe load errors
    this.iframeEl.addEventListener("error", () => {
      console.error("Failed to load OpenCode iframe");
    });
  }

  private renderErrorState(): void {
    this.contentEl.empty();

    const statusContainer = this.contentEl.createDiv({
      cls: "opencode-status-container opencode-error",
    });

    const iconEl = statusContainer.createDiv({ cls: "opencode-status-icon" });
    setIcon(iconEl, "alert-circle");

    statusContainer.createEl("h3", { text: "Failed to start OpenCode" });
    statusContainer.createEl("p", {
      text: "There was an error starting the OpenCode server. Please check that OpenCode is installed and try again.",
      cls: "opencode-status-message",
    });

    const retryButton = statusContainer.createEl("button", {
      text: "Retry",
      cls: "mod-cta",
    });
    retryButton.addEventListener("click", () => {
      this.plugin.startServer();
    });

    const settingsButton = statusContainer.createEl("button", {
      text: "Open Settings",
    });
    settingsButton.addEventListener("click", () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-opencode");
    });
  }

  private reloadIframe(): void {
    if (this.iframeEl) {
      const src = this.iframeEl.src;
      this.iframeEl.src = "about:blank";
      setTimeout(() => {
        if (this.iframeEl) {
          this.iframeEl.src = src;
        }
      }, 100);
    }
  }
}
