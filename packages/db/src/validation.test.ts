import { describe, expect, it } from "vitest";
import { SEED_IDEA_MAX_LENGTH, validateSeedIdea } from "./validation";

describe("validateSeedIdea", () => {
  it("accepts a real idea and trims surrounding whitespace", () => {
    const result = validateSeedIdea("  A solid business idea  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("A solid business idea");
    }
  });

  it("rejects empty and whitespace-only input", () => {
    expect(validateSeedIdea("").ok).toBe(false);
    expect(validateSeedIdea("   ").ok).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(validateSeedIdea(undefined).ok).toBe(false);
    expect(validateSeedIdea(42).ok).toBe(false);
    expect(validateSeedIdea(null).ok).toBe(false);
  });

  it("rejects too-short ideas with clear guidance", () => {
    const result = validateSeedIdea("short");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least/i);
    }
  });

  it("rejects ideas longer than the maximum", () => {
    const result = validateSeedIdea("x".repeat(SEED_IDEA_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
  });
});
