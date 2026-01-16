export const BRIDGE_PROTOCOL = "oc-obsidian-bridge";
export const BRIDGE_VERSION = "1.0.0";

export interface BridgeEnvelope<T = unknown> {
  protocol: typeof BRIDGE_PROTOCOL;
  version: typeof BRIDGE_VERSION;
  channelId: string;
  type: string;
  payload: T;
}

export type PluginToUIMessageType =
  | "bridge/init"
  | "bridge/context"
  | "bridge/session/active"
  | "bridge/personality/active";

export type UIToPluginMessageType =
  | "ui/ready"
  | "ui/session/selected"
  | "ui/requestContextNow"
  | "ui/vault/openFile"
  | "ui/vault/createNote"
  | "ui/editor/insertText"
  | "ui/personality/set"
  | "ui/canvas/compileWorkflow";

export type BridgeMessageType = PluginToUIMessageType | UIToPluginMessageType;

export interface BridgeInitPayload {
  vaultName: string;
  pluginVersion: string;
  serverUrl: string;
  devMode?: boolean;
}

export interface BridgeContextPayload {
  activeFile: string | null;
  selection: string | null;
  openTabs: string[];
  cursorPosition?: { line: number; ch: number };
}

export interface BridgeSessionActivePayload {
  sessionId: string;
}

export interface BridgePersonalityActivePayload {
  personalityId: string;
  name: string;
}

export interface UIReadyPayload {
  uiVersion?: string;
}

export interface UISessionSelectedPayload {
  sessionId: string;
}

export interface UIRequestContextNowPayload {
  sessionId: string;
}

export interface UIVaultOpenFilePayload {
  path: string;
  line?: number;
}

export interface UIVaultCreateNotePayload {
  path: string;
  content: string;
}

export interface UIEditorInsertTextPayload {
  text: string;
  position?: "cursor" | "end";
}

export interface UIPersonalitySetPayload {
  personalityId: string;
}

export interface UICanvasCompileWorkflowPayload {
  canvasPath: string;
}
