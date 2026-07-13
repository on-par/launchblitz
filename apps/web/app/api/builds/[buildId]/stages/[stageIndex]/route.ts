import { NextResponse } from "next/server";
import { stageOutputText, validateEditedContent, type StageOutputRecord } from "@launchblitz/db";
import { getSession } from "../../../../../../lib/auth";
import { getStageOutputsRepository } from "../../../../../../lib/stage-outputs";

// Database-backed stage outputs run on the Node.js runtime (pg driver).
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string; stageIndex: string }>;
}

function toResponsePayload(record: StageOutputRecord) {
  return {
    stageOutput: {
      id: record.id,
      buildId: record.buildId,
      stageIndex: record.stageIndex,
      stageName: record.stageName,
      rawText: stageOutputText(record.rawOutput),
      editedText:
        record.editedOutput === null ? null : stageOutputText(record.editedOutput),
    },
  };
}

function parseStageIndex(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Read a single stage output for the current founder.
 * - 401 when there is no authenticated founder.
 * - 404 for a malformed address, a missing record, or one owned by another
 *   founder (deliberately identical — no ownership enumeration).
 * - 200 with the raw + edited text otherwise.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view this build." }, { status: 401 });
  }

  const { buildId, stageIndex: rawStageIndex } = await params;
  const stageIndex = parseStageIndex(rawStageIndex);
  if (stageIndex === null) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  const record = await getStageOutputsRepository().getForUser(
    buildId,
    stageIndex,
    session.userId,
  );
  if (!record) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  return NextResponse.json(toResponsePayload(record));
}

/**
 * Save a founder's inline edit of a stage output. `rawOutput` is never
 * written by this route — only `editedOutput` is overwritten.
 * - 401 when there is no authenticated founder.
 * - 400 with founder-facing guidance when the edit is empty or invalid.
 * - 404 for a malformed address, a missing record, or one owned by another
 *   founder.
 * - 200 with the updated raw + edited text otherwise.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view this build." }, { status: 401 });
  }

  const { buildId, stageIndex: rawStageIndex } = await params;
  const stageIndex = parseStageIndex(rawStageIndex);
  if (stageIndex === null) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const editedContent =
    payload && typeof payload === "object"
      ? (payload as { editedContent?: unknown }).editedContent
      : undefined;

  const validation = validateEditedContent(editedContent);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const record = await getStageOutputsRepository().saveEditForUser(
    buildId,
    stageIndex,
    session.userId,
    validation.value,
  );
  if (!record) {
    return NextResponse.json({ error: "Stage output not found." }, { status: 404 });
  }

  return NextResponse.json(toResponsePayload(record));
}
