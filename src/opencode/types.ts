export type ServerState = "stopped" | "starting" | "running" | "error";

export interface ServerConfig {
  port: number;
  hostname: string;
  opencodePath: string;
  projectDirectory: string;
  startupTimeout: number;
  corsOrigins: string[];
  basicAuth?: {
    username: string;
    password: string;
  };
}

export const DEFAULT_CORS_ORIGINS = ["app://obsidian.md"];

export const DEV_CORS_ORIGIN = "http://localhost:5173";
