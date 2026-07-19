import { NextResponse } from "next/server";
import { validateEditRequest, type ArtifactRevisionRecord } from "@launchblitz/db";
import { assembleLaunchPacket, buildLandingPageArtifact, getMissingLandingPageSections } from "@launchblitz/workflow";
import { getSession } from "../../../../../lib/auth";
import { getArtifactRevisionsRepository } from "../../../../../lib/artifact-revisions";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../lib/packet-data";

// Constructs the artifact-revisions repository — Node.js runtime for DB access.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

function serialize(record: ArtifactRevisionRecord) {
  return {
    id: record.id,
    revisionNumber: record.revisionNumber,
    editRequest: record.editRequest,
    createdAt: record.createdAt?.toISOString() ?? null,
  };
}

/**
 * Create the next artifact revision from a founder's text change request.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 400 when the request text is missing, empty, or too long.
 * - 409 when the Copy Deck stage is not yet approved.
 * - 201 with the created revision (creates the baseline revision 1 first if
 *   none exists yet).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to request a change." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateEditRequest((body as { request?: unknown } | null)?.request);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const packet = assembleLaunchPacket(await getStageOutputRecords(buildId));
  const missing = getMissingLandingPageSections(packet);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Approve these stages before requesting changes: ${missing.join(", ")}.`,
        missingSections: missing,
      },
      { status: 409 },
    );
  }

  const repo = getArtifactRevisionsRepository();
  if (!(await repo.getLatestForUser(buildId, session.userId))) {
    await repo.createForUser(
      {
        buildId,
        editRequest: null,
        artifact: buildLandingPageArtifact(packet, { buildId, generatedAt: new Date().toISOString() }),
      },
      session.userId,
    );
  }

  const record = await repo.createForUser(
    {
      buildId,
      editRequest: validation.value,
      artifact: buildLandingPageArtifact(packet, { buildId, generatedAt: new Date().toISOString() }),
    },
    session.userId,
  );
  if (!record) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  return NextResponse.json({ revision: serialize(record) }, { status: 201 });
}

/**
 * List a build's artifact revision history, oldest first.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 200 with the revision history (empty array when none exist yet).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view revision history." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const revisions = await getArtifactRevisionsRepository().listForUser(buildId, session.userId);
  return NextResponse.json({ revisions: revisions.map(serialize) }, { status: 200 });
}
