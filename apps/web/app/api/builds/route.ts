import { NextResponse } from "next/server";
import { validateSeedIdea } from "@launchblitz/db";
import { getSession } from "../../../lib/auth";
import { getBuildsRepository } from "../../../lib/builds";

// Database-backed builds run on the Node.js runtime (pg driver).
export const runtime = "nodejs";

/**
 * Create a new Build seeded with the founder's raw idea.
 * - 401 when there is no authenticated founder.
 * - 400 with founder-facing guidance when the idea is empty or invalid.
 * - 201 with the created build otherwise. `userId` comes from the session
 *   only — never from the request body.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to start a build." }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const idea = payload && typeof payload === "object" ? (payload as { idea?: unknown }).idea : undefined;

  const validation = validateSeedIdea(idea);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const build = await getBuildsRepository().create({
    userId: session.userId,
    seedIdea: validation.value,
  });

  return NextResponse.json(
    {
      build: {
        id: build.id,
        status: build.status,
        currentStage: build.currentStage,
        seedIdea: build.seedIdea,
      },
    },
    { status: 201 },
  );
}
