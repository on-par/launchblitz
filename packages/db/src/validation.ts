// Validation for the raw founder idea ("seed idea") that starts a Build.
// Shared by the create-build API route and the repository tests so the rules
// stay in one place.

export const SEED_IDEA_MIN_LENGTH = 10;
export const SEED_IDEA_MAX_LENGTH = 5000;

export type SeedIdeaValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validate and normalize a raw seed idea submission.
 * Trims surrounding whitespace and enforces a sensible length range so empty or
 * throwaway submissions are rejected with founder-facing guidance.
 */
export function validateSeedIdea(raw: unknown): SeedIdeaValidation {
  if (typeof raw !== "string") {
    return { ok: false, error: "Describe your idea to start a build." };
  }

  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, error: "Describe your idea to start a build." };
  }

  if (value.length < SEED_IDEA_MIN_LENGTH) {
    return {
      ok: false,
      error: `Add a bit more detail — at least ${SEED_IDEA_MIN_LENGTH} characters.`,
    };
  }

  if (value.length > SEED_IDEA_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep your idea under ${SEED_IDEA_MAX_LENGTH} characters for now.`,
    };
  }

  return { ok: true, value };
}
