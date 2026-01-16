import { describe, test, expect } from "bun:test";
import { BridgeEnvelopeSchema, PayloadSchemas } from "../src/bridge/zodSchemas";
import { BRIDGE_PROTOCOL, BRIDGE_VERSION } from "../src/bridge/bridgeTypes";

describe("BridgeEnvelopeSchema", () => {
  test("accepts valid envelope", () => {
    const valid = {
      protocol: BRIDGE_PROTOCOL,
      version: BRIDGE_VERSION,
      channelId: "abc123",
      type: "ui/ready",
      payload: {},
    };
    const result = BridgeEnvelopeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("rejects wrong protocol", () => {
    const invalid = {
      protocol: "wrong-protocol",
      version: BRIDGE_VERSION,
      channelId: "abc123",
      type: "ui/ready",
      payload: {},
    };
    const result = BridgeEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("rejects wrong version", () => {
    const invalid = {
      protocol: BRIDGE_PROTOCOL,
      version: "0.0.1",
      channelId: "abc123",
      type: "ui/ready",
      payload: {},
    };
    const result = BridgeEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("rejects empty channelId", () => {
    const invalid = {
      protocol: BRIDGE_PROTOCOL,
      version: BRIDGE_VERSION,
      channelId: "",
      type: "ui/ready",
      payload: {},
    };
    const result = BridgeEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("PayloadSchemas", () => {
  test("ui/session/selected requires sessionId", () => {
    const schema = PayloadSchemas["ui/session/selected"];
    expect(schema).toBeDefined();

    const valid = { sessionId: "ses_123" };
    expect(schema.safeParse(valid).success).toBe(true);

    const invalid = { sessionId: "" };
    expect(schema.safeParse(invalid).success).toBe(false);

    const missing = {};
    expect(schema.safeParse(missing).success).toBe(false);
  });

  test("ui/vault/openFile requires path", () => {
    const schema = PayloadSchemas["ui/vault/openFile"];
    expect(schema).toBeDefined();

    const valid = { path: "notes/hello.md" };
    expect(schema.safeParse(valid).success).toBe(true);

    const withLine = { path: "notes/hello.md", line: 42 };
    expect(schema.safeParse(withLine).success).toBe(true);

    const invalid = { path: "" };
    expect(schema.safeParse(invalid).success).toBe(false);
  });

  test("ui/ready is optional payload", () => {
    const schema = PayloadSchemas["ui/ready"];
    expect(schema).toBeDefined();

    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ uiVersion: "1.0.0" }).success).toBe(true);
  });
});
