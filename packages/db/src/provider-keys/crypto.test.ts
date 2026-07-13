import { describe, expect, it } from "vitest";
import { decryptProviderKey, encryptProviderKey, maskProviderKey } from "./crypto";

describe("encryptProviderKey / decryptProviderKey", () => {
  it("roundtrips the plaintext", () => {
    const plaintext = "sk-ant-super-secret-key-123";
    const payload = encryptProviderKey(plaintext, "test-secret");
    expect(decryptProviderKey(payload, "test-secret")).toBe(plaintext);
  });

  it("does not contain the plaintext, and differs across encryptions of the same input", () => {
    const plaintext = "sk-ant-super-secret-key-123";
    const first = encryptProviderKey(plaintext, "test-secret");
    const second = encryptProviderKey(plaintext, "test-secret");

    expect(first).not.toContain(plaintext);
    expect(second).not.toContain(plaintext);
    expect(first).not.toBe(second);
  });

  it("throws on a tampered payload", () => {
    const payload = encryptProviderKey("sk-ant-super-secret-key-123", "test-secret");
    const parts = payload.split(".");
    const ciphertext = parts[3];
    const flippedChar = ciphertext[0] === "A" ? "B" : "A";
    parts[3] = flippedChar + ciphertext.slice(1);
    const tampered = parts.join(".");

    expect(() => decryptProviderKey(tampered, "test-secret")).toThrow();
  });

  it("throws on the wrong secret", () => {
    const payload = encryptProviderKey("sk-ant-super-secret-key-123", "test-secret");
    expect(() => decryptProviderKey(payload, "wrong-secret")).toThrow();
  });

  it("throws when encrypting with an empty secret", () => {
    expect(() => encryptProviderKey("sk-ant-super-secret-key-123", "")).toThrow();
  });
});

describe("maskProviderKey", () => {
  it("returns the last 4 characters for keys of length >= 12", () => {
    expect(maskProviderKey("sk-ant-api03-longenoughkey")).toBe("…hkey");
  });

  it("never reveals characters of a short key", () => {
    expect(maskProviderKey("short12")).toBe("••••");
  });
});
