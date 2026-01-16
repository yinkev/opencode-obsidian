import { z } from "zod/v4";
import { BRIDGE_PROTOCOL, BRIDGE_VERSION } from "./bridgeTypes";

export const BridgeEnvelopeSchema = z.object({
  protocol: z.literal(BRIDGE_PROTOCOL),
  version: z.literal(BRIDGE_VERSION),
  channelId: z.string().min(1),
  type: z.string().min(1),
  payload: z.unknown(),
});

export const UIReadyPayloadSchema = z.object({
  uiVersion: z.string().optional(),
});

export const UISessionSelectedPayloadSchema = z.object({
  sessionId: z.string().min(1),
});

export const UIRequestContextNowPayloadSchema = z.object({
  sessionId: z.string().min(1),
});

export const UIVaultOpenFilePayloadSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().nonnegative().optional(),
});

export const UIVaultCreateNotePayloadSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const UIEditorInsertTextPayloadSchema = z.object({
  text: z.string(),
  position: z.enum(["cursor", "end"]).optional(),
});

export const UIPersonalitySetPayloadSchema = z.object({
  personalityId: z.string().min(1),
});

export const UICanvasCompileWorkflowPayloadSchema = z.object({
  canvasPath: z.string().min(1),
});

export const PayloadSchemas: Record<string, z.ZodSchema> = {
  "ui/ready": UIReadyPayloadSchema,
  "ui/session/selected": UISessionSelectedPayloadSchema,
  "ui/requestContextNow": UIRequestContextNowPayloadSchema,
  "ui/vault/openFile": UIVaultOpenFilePayloadSchema,
  "ui/vault/createNote": UIVaultCreateNotePayloadSchema,
  "ui/editor/insertText": UIEditorInsertTextPayloadSchema,
  "ui/personality/set": UIPersonalitySetPayloadSchema,
  "ui/canvas/compileWorkflow": UICanvasCompileWorkflowPayloadSchema,
};
