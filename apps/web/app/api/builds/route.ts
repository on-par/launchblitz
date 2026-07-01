import { NextResponse } from "next/server";
import { validateSeedIdea } from "@launchblitz/db";
import { getCurrentUserId } from "../../../lib/auth";
import { getBuildsRepository } from "../../../lib/builds";

// Database-backed builds run on the Node.js runtime (pg driver).
export const runtime = "nodejs";

/**
 * Create a build from a founder's raw idea.
 * - 401 when there is no authenticated founder.
 * - 400 with founder-facing guidance when the idea is empty or invalid.
 * - 201 with the new build (tied to the current user, initial status + stage).
 */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to start a build." }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const seedIdea =
    payload && typeof payload === "object"
      ? (payload as { seedIdea?: unknown }).seedIdea
      : undefined;

  const validation = validateSeedIdea(seedIdea);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const build = await getBuildsRepository().create({
    userId,
    seedIdea: validation.value,
  });

  return NextResponse.json({ build }, { status: 201 });
}
