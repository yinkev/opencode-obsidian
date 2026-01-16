import {
  BRIDGE_PROTOCOL,
  BRIDGE_VERSION,
  BridgeEnvelope,
  BridgeMessageType,
  UIToPluginMessageType,
} from "./bridgeTypes";
import { BridgeEnvelopeSchema, PayloadSchemas } from "./zodSchemas";
import { randomIdHex } from "../util/hash";

export interface BridgeHostConfig {
  allowedOrigins: string[];
  devMode?: boolean;
}

export type BridgeMessageHandler = (
  type: UIToPluginMessageType,
  payload: unknown,
  channelId: string
) => void;

export class BridgeHost {
  private config: BridgeHostConfig;
  private channelId: string;
  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: BridgeMessageHandler | null = null;
  private boundOnMessage: ((event: MessageEvent) => void) | null = null;

  constructor(config: BridgeHostConfig) {
    this.config = config;
    this.channelId = randomIdHex(16);
  }

  getChannelId(): string {
    return this.channelId;
  }

  attach(iframe: HTMLIFrameElement, handler: BridgeMessageHandler): void {
    this.detach();

    this.iframe = iframe;
    this.messageHandler = handler;

    this.boundOnMessage = this.onMessage.bind(this);
    window.addEventListener("message", this.boundOnMessage as EventListener);
  }

  detach(): void {
    if (this.boundOnMessage) {
      window.removeEventListener("message", this.boundOnMessage as EventListener);
      this.boundOnMessage = null;
    }
    this.iframe = null;
    this.messageHandler = null;
  }

  send<T>(type: BridgeMessageType, payload: T): void {
    if (!this.iframe?.contentWindow) {
      console.warn("[BridgeHost] Cannot send: iframe not attached or no contentWindow");
      return;
    }

    const envelope: BridgeEnvelope<T> = {
      protocol: BRIDGE_PROTOCOL,
      version: BRIDGE_VERSION,
      channelId: this.channelId,
      type,
      payload,
    };

    const targetOrigin = this.config.devMode ? "*" : this.config.allowedOrigins[0] || "*";
    this.iframe.contentWindow.postMessage(envelope, targetOrigin);
  }

  private onMessage(event: MessageEvent): void {
    if (!this.isOriginAllowed(event.origin)) {
      console.warn("[BridgeHost] Rejected message from disallowed origin:", event.origin);
      return;
    }

    const envelope = this.validateEnvelope(event.data);
    if (!envelope) {
      return;
    }

    if (envelope.channelId !== this.channelId) {
      console.warn("[BridgeHost] Rejected message with wrong channelId:", envelope.channelId);
      return;
    }

    const payload = this.validatePayload(envelope.type, envelope.payload);
    if (payload === null && PayloadSchemas[envelope.type]) {
      console.warn("[BridgeHost] Rejected message with invalid payload for type:", envelope.type);
      return;
    }

    this.messageHandler?.(
      envelope.type as UIToPluginMessageType,
      payload ?? envelope.payload,
      envelope.channelId
    );
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.config.devMode && origin.startsWith("http://localhost")) {
      return true;
    }
    return this.config.allowedOrigins.includes(origin);
  }

  private validateEnvelope(data: unknown): BridgeEnvelope | null {
    const result = BridgeEnvelopeSchema.safeParse(data);
    if (!result.success) {
      return null;
    }
    return result.data as BridgeEnvelope;
  }

  private validatePayload(type: string, payload: unknown): unknown | null {
    const schema = PayloadSchemas[type];
    if (!schema) {
      return payload;
    }
    const result = schema.safeParse(payload);
    if (!result.success) {
      return null;
    }
    return result.data;
  }
}
