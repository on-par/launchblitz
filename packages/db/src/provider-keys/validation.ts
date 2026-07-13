export const MVP_PROVIDERS = ["anthropic"] as const;
export type MvpProvider = (typeof MVP_PROVIDERS)[number];

export type ParsedSaveProviderKeyInput =
  | { ok: true; value: { provider: MvpProvider; key: string } }
  | { ok: false; error: string };

function isMvpProvider(value: unknown): value is MvpProvider {
  return typeof value === "string" && (MVP_PROVIDERS as readonly string[]).includes(value);
}

// Rejects space/tab/newline/etc (code <= 0x20) and DEL (0x7F) anywhere in the key.
function hasWhitespaceOrControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Validate the body of a save-provider-key request. Never echoes the submitted key. */
export function parseSaveProviderKeyInput(body: unknown): ParsedSaveProviderKeyInput {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object." };
  }

  const { provider, key } = body as Record<string, unknown>;

  if (!isMvpProvider(provider)) {
    return { ok: false, error: "Unsupported provider." };
  }

  if (typeof key !== "string") {
    return { ok: false, error: "Key is required." };
  }

  const trimmed = key.trim();
  if (trimmed.length < 8 || trimmed.length > 512) {
    return { ok: false, error: "Key must be between 8 and 512 characters." };
  }

  if (hasWhitespaceOrControlChar(trimmed)) {
    return { ok: false, error: "Key must not contain whitespace or control characters." };
  }

  return { ok: true, value: { provider, key: trimmed } };
}
