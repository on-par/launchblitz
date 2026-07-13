import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const FORMAT_VERSION = "v1";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a provider key for storage. Returns `v1.<iv>.<authTag>.<ciphertext>` (base64 parts). */
export function encryptProviderKey(plaintext: string, secret: string): string {
  if (!secret) {
    throw new Error("Encryption secret is required.");
  }

  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [FORMAT_VERSION, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    ".",
  );
}

/** Decrypt a payload produced by {@link encryptProviderKey}. Throws on tamper, wrong secret, or bad format. */
export function decryptProviderKey(payload: string, secret: string): string {
  if (!secret) {
    throw new Error("Encryption secret is required.");
  }

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error("Unrecognized provider key payload format.");
  }
  const [, ivB64, authTagB64, ciphertextB64] = parts;

  const key = deriveKey(secret);
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString("utf8");
}

/** Masked display hint for a provider key — never reveals a short key's characters. */
export function maskProviderKey(plaintext: string): string {
  if (plaintext.length < 12) {
    return "••••";
  }
  return `…${plaintext.slice(-4)}`;
}
