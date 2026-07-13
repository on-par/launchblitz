import { NextResponse } from "next/server";
import { getBuildForUser, updateBuild, upsertStageOutput } from "@launchblitz/db";
import { parseRunStageBody, runFirstStage, type StageOneStore } from "@launchblitz/workflow";
import { getSession } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createStore(): StageOneStore {
  const db = getDb();
  return {
    async getBuildForUser(buildId, userId) {
      return getBuildForUser(db, buildId, userId);
    },
    async updateBuild(buildId, patch) {
      await updateBuild(db, buildId, patch);
    },
    async upsertStageOutput(row) {
      await upsertStageOutput(db, row);
    },
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ buildId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to run a stage." }, { status: 401 });
  }

  const { buildId } = await params;
  if (!UUID_PATTERN.test(buildId)) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const parsed = parseRunStageBody(await request.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const result = await runFirstStage(createStore(), {
    buildId,
    userId: session.userId,
    idea: parsed.idea,
    keys: { anthropic: process.env.ANTHROPIC_API_KEY },
  });

  if (result.ok) {
    return NextResponse.json({ output: result.output, provider: result.provider, model: result.model });
  }

  switch (result.code) {
    case "not_found":
      return NextResponse.json({ error: result.message }, { status: 404 });
    case "missing_idea":
      return NextResponse.json({ error: result.message }, { status: 400 });
    case "stage_failed":
      return NextResponse.json({ error: result.message }, { status: 502 });
  }
}
