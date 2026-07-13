import { describe, expect, it } from "vitest";
import { parseSaveProviderKeyInput } from "./validation";

describe("parseSaveProviderKeyInput", () => {
  it("accepts a valid anthropic key", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic", key: "sk-ant-valid-key-123" });
    expect(result).toEqual({ ok: true, value: { provider: "anthropic", key: "sk-ant-valid-key-123" } });
  });

  it("trims surrounding whitespace from the key", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic", key: "  sk-ant-valid-key-123  " });
    expect(result).toEqual({ ok: true, value: { provider: "anthropic", key: "sk-ant-valid-key-123" } });
  });

  it("rejects an unknown provider", () => {
    const result = parseSaveProviderKeyInput({ provider: "openai", key: "sk-ant-valid-key-123" });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing key", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic" });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-string key", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic", key: 12345 });
    expect(result.ok).toBe(false);
  });

  it("rejects a key shorter than 8 characters", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic", key: "short" });
    expect(result.ok).toBe(false);
  });

  it("rejects a key longer than 512 characters", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic", key: "a".repeat(513) });
    expect(result.ok).toBe(false);
  });

  it("rejects a key with interior whitespace", () => {
    const result = parseSaveProviderKeyInput({ provider: "anthropic", key: "sk-ant valid-key-123" });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(parseSaveProviderKeyInput("not-an-object").ok).toBe(false);
    expect(parseSaveProviderKeyInput(null).ok).toBe(false);
    expect(parseSaveProviderKeyInput(undefined).ok).toBe(false);
    expect(parseSaveProviderKeyInput(42).ok).toBe(false);
  });

  it("never echoes the submitted key in an error message", () => {
    const secretKey = "sk-ant super-secret-payload-xyz";
    const results = [
      parseSaveProviderKeyInput({ provider: "openai", key: secretKey }),
      parseSaveProviderKeyInput({ provider: "anthropic", key: secretKey }),
    ];

    for (const result of results) {
      if (!result.ok) {
        expect(result.error).not.toContain(secretKey);
      }
    }
  });
});
