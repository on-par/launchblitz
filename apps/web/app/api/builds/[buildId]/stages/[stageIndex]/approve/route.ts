import { NextResponse } from "next/server";
import { nextStageAfterApproval, toStageOutputView } from "@launchblitz/db";
import { getSession } from "../../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../../lib/builds";
import { getStageOutputsRepository } from "../../../../../../../lib/stage-outputs";
import { STAGE_NAMES } from "../../../../../../../lib/stages";
import { parseStageIndex } from "../../stage-index";

// Database-backed stage outputs run on the Node.js runtime (pg driver).
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string; stageIndex: string }>;
}

/**
 * Approve a founder's generated Stage output: stamps `approvedAt` and, when
 * the approved stage is the build's current stage, advances `currentStage`
 * so the next stage unlocks.
 * - 401 when there is no authenticated founder.
 * - 404 for a malformed address, a missing build, or one owned by another
 *   founder (deliberately identical — no ownership enumeration).
 * - 409 when the stage is locked (later than the build's current stage).
 * - 404 when nothing has been generated for the stage yet.
 * - 200 with the updated stage output and the build's post-approval stage.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view this build." }, { status: 401 });
  }

  const { buildId, stageIndex: rawStageIndex } = await params;
  const stageIndex = parseStageIndex(rawStageIndex);
  if (stageIndex === null) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  if (stageIndex > build.currentStage) {
    return NextResponse.json(
      { error: "Approve the earlier stages first." },
      { status: 409 },
    );
  }

  const record = await getStageOutputsRepository().approveForUser(
    buildId,
    stageIndex,
    session.userId,
  );
  if (!record) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  let currentStage = build.currentStage;
  const nextStage = nextStageAfterApproval(stageIndex, build.currentStage, STAGE_NAMES.length);
  if (nextStage !== build.currentStage) {
    await getBuildsRepository().setCurrentStageForUser(buildId, session.userId, nextStage);
    currentStage = nextStage;
  }

  return NextResponse.json({
    stageOutput: toStageOutputView(record),
    build: { currentStage },
  });
}
