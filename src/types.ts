export type ViewLocation = "sidebar" | "main";

export interface OpenCodeSettings {
  port: number;
  hostname: string;
  autoStart: boolean;
  opencodePath: string;
  projectDirectory: string;
  startupTimeout: number;
  defaultViewLocation: ViewLocation;
  devMode?: boolean;
}

export const DEFAULT_SETTINGS: OpenCodeSettings = {
  port: 14096,
  hostname: "127.0.0.1",
  autoStart: false,
  opencodePath: "opencode",
  projectDirectory: "",
  startupTimeout: 15000,
  defaultViewLocation: "sidebar",
};

export const OPENCODE_VIEW_TYPE = "opencode-view";
