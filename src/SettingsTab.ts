import { App, PluginSettingTab, Setting } from "obsidian";
import type OpenCodePlugin from "./main";

export class OpenCodeSettingTab extends PluginSettingTab {
  plugin: OpenCodePlugin;

  constructor(app: App, plugin: OpenCodePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "OpenCode Settings" });

    // Server settings section
    containerEl.createEl("h3", { text: "Server Configuration" });

    new Setting(containerEl)
      .setName("Port")
      .setDesc("Port number for the OpenCode web server")
      .addText((text) =>
        text
          .setPlaceholder("14096")
          .setValue(this.plugin.settings.port.toString())
          .onChange(async (value) => {
            const port = parseInt(value, 10);
            if (!isNaN(port) && port > 0 && port < 65536) {
              this.plugin.settings.port = port;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Hostname")
      .setDesc("Hostname to bind the server to (usually 127.0.0.1)")
      .addText((text) =>
        text
          .setPlaceholder("127.0.0.1")
          .setValue(this.plugin.settings.hostname)
          .onChange(async (value) => {
            this.plugin.settings.hostname = value || "127.0.0.1";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("OpenCode path")
      .setDesc(
        "Path to the OpenCode executable. Leave as 'opencode' if it's in your PATH."
      )
      .addText((text) =>
        text
          .setPlaceholder("opencode")
          .setValue(this.plugin.settings.opencodePath)
          .onChange(async (value) => {
            this.plugin.settings.opencodePath = value || "opencode";
            await this.plugin.saveSettings();
          })
      );

    // Behavior settings section
    containerEl.createEl("h3", { text: "Behavior" });

    new Setting(containerEl)
      .setName("Auto-start server")
      .setDesc(
        "Automatically start the OpenCode server when Obsidian opens (not recommended for faster startup)"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoStart)
          .onChange(async (value) => {
            this.plugin.settings.autoStart = value;
            await this.plugin.saveSettings();
          })
      );

    // Server status section
    containerEl.createEl("h3", { text: "Server Status" });

    const statusContainer = containerEl.createDiv({ cls: "opencode-settings-status" });
    this.renderServerStatus(statusContainer);
  }

  private renderServerStatus(container: HTMLElement): void {
    container.empty();

    const state = this.plugin.getProcessState();
    const statusText = {
      stopped: "Stopped",
      starting: "Starting...",
      running: "Running",
      error: "Error",
    };

    const statusClass = {
      stopped: "status-stopped",
      starting: "status-starting",
      running: "status-running",
      error: "status-error",
    };

    const statusEl = container.createDiv({ cls: "opencode-status-line" });
    statusEl.createSpan({ text: "Status: " });
    statusEl.createSpan({
      text: statusText[state],
      cls: `opencode-status-badge ${statusClass[state]}`,
    });

    if (state === "running") {
      const urlEl = container.createDiv({ cls: "opencode-status-line" });
      urlEl.createSpan({ text: "URL: " });
      const linkEl = urlEl.createEl("a", {
        text: this.plugin.getServerUrl(),
        href: this.plugin.getServerUrl(),
      });
      linkEl.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(this.plugin.getServerUrl(), "_blank");
      });
    }

    // Control buttons
    const buttonContainer = container.createDiv({ cls: "opencode-settings-buttons" });

    if (state === "stopped" || state === "error") {
      const startButton = buttonContainer.createEl("button", {
        text: "Start Server",
        cls: "mod-cta",
      });
      startButton.addEventListener("click", async () => {
        await this.plugin.startServer();
        this.renderServerStatus(container);
      });
    }

    if (state === "running") {
      const stopButton = buttonContainer.createEl("button", {
        text: "Stop Server",
      });
      stopButton.addEventListener("click", () => {
        this.plugin.stopServer();
        this.renderServerStatus(container);
      });

      const restartButton = buttonContainer.createEl("button", {
        text: "Restart Server",
        cls: "mod-warning",
      });
      restartButton.addEventListener("click", async () => {
        this.plugin.stopServer();
        await this.plugin.startServer();
        this.renderServerStatus(container);
      });
    }

    if (state === "starting") {
      buttonContainer.createSpan({
        text: "Please wait...",
        cls: "opencode-status-waiting",
      });
    }
  }
}
