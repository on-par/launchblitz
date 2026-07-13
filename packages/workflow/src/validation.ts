const MAX_IDEA_LENGTH = 2000;

export type ParseRunStageBodyResult = { ok: true; idea?: string } | { ok: false; message: string };

export function parseRunStageBody(body: unknown): ParseRunStageBodyResult {
  if (body === null || typeof body !== "object") {
    return { ok: false, message: "Request body must be an object." };
  }

  const idea = (body as { idea?: unknown }).idea;
  if (idea === undefined) {
    return { ok: true };
  }
  if (typeof idea !== "string") {
    return { ok: false, message: "idea must be a string." };
  }

  const trimmed = idea.trim();
  if (trimmed.length > MAX_IDEA_LENGTH) {
    return { ok: false, message: `idea must be ${MAX_IDEA_LENGTH} characters or fewer.` };
  }

  return { ok: true, idea: trimmed || undefined };
}
