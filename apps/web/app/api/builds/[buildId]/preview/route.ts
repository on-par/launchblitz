import { NextResponse } from "next/server";
import { startStaticSitePreview, DEFAULT_PREVIEW_TTL_MS, type StaticPreview } from "@launchblitz/sandbox";
import { assembleLaunchPacket, buildLandingPageArtifact, getMissingLandingPageSections } from "@launchblitz/workflow";
import { getSession } from "../../../../../lib/auth";
import { getArtifactRevisionsRepository } from "../../../../../lib/artifact-revisions";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../lib/packet-data";
import { getPreviewProgressStore, getPreviewStore, getSandboxAdapter } from "../../../../../lib/sandbox";

// Constructs the sandbox adapter with real provider credentials — Node.js runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

type PreviewStart = StaticPreview & { revisionNumber: number };

// Thrown from inside the deduped startPreview() below so the missing-sections
// / ownership responses stay distinguishable from a genuine sandbox failure.
class MissingSectionsError extends Error {
  constructor(readonly missing: string[]) {
    super("Missing required sections");
  }
}
class BuildNotFoundError extends Error {}

// Dedupe concurrent starts for the same build: without this, two requests
// that both read "no active preview" before either finishes would each
// resolve/create a separate artifact revision and provision a separate
// (billable) sandbox, orphaning all but the last.
const inFlightPreviews = new Map<string, Promise<PreviewStart>>();

async function resolveServingArtifact(buildId: string, userId: string) {
  const revisions = getArtifactRevisionsRepository();
  const latest = await revisions.getLatestForUser(buildId, userId);
  if (latest) {
    return latest;
  }

  const packet = assembleLaunchPacket(await getStageOutputRecords(buildId));
  const missing = getMissingLandingPageSections(packet);
  if (missing.length > 0) {
    throw new MissingSectionsError(missing);
  }

  const artifact = buildLandingPageArtifact(packet, { buildId, generatedAt: new Date().toISOString() });
  const created = await revisions.createForUser({ buildId, editRequest: null, artifact }, userId);
  if (!created) {
    throw new BuildNotFoundError();
  }
  return created;
}

function startPreview(buildId: string, userId: string): Promise<PreviewStart> {
  const pending = inFlightPreviews.get(buildId);
  if (pending) {
    return pending;
  }
  const promise = (async (): Promise<PreviewStart> => {
    const serving = await resolveServingArtifact(buildId, userId);
    const files = serving.artifact.files.map((file) => ({ path: file.path, content: file.contents }));

    getPreviewProgressStore().begin(buildId);
    const preview = await startStaticSitePreview(getSandboxAdapter(), {
      files,
      label: buildId,
      ttlMs: DEFAULT_PREVIEW_TTL_MS,
      now: new Date(),
      onProgress: (event) => getPreviewProgressStore().setPhase(buildId, event.phase, event.workspaceId ?? undefined),
    });

    return { ...preview, revisionNumber: serving.revisionNumber };
  })().finally(() => inFlightPreviews.delete(buildId));
  inFlightPreviews.set(buildId, promise);
  return promise;
}

/**
 * Start (or reuse) a hosted preview of the generated landing page, serving
 * the latest artifact revision's stored files (creating baseline revision 1
 * on first start).
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 409 when the Copy Deck stage is not yet approved (only reachable before
 *   any revision exists).
 * - `{ "restart": true }` tears down the active sandbox and restarts it from
 *   the latest revision, even if one is already running.
 * - 201 with the preview url/expiresAt/revisionNumber (200 if one is already
 *   active and this isn't a restart).
 * - 502 if the sandbox provider fails to start the preview.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to start a preview." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const restart = Boolean(body && typeof body === "object" && (body as { restart?: unknown }).restart === true);

  const existing = getPreviewStore().getActive(buildId, new Date());
  if (existing && !restart) {
    return NextResponse.json(
      { preview: { url: existing.url, expiresAt: existing.expiresAt, revisionNumber: existing.revisionNumber } },
      { status: 200 },
    );
  }

  if (restart && existing) {
    // Best-effort teardown so a restart never stacks a second live sandbox.
    getPreviewStore().delete(buildId);
    await getSandboxAdapter().destroyWorkspace(existing.workspaceId).catch(() => {});
  }

  try {
    const preview = await startPreview(buildId, session.userId);

    getPreviewStore().set({
      buildId,
      workspaceId: preview.workspaceId,
      url: preview.url,
      expiresAt: preview.expiresAt,
      revisionNumber: preview.revisionNumber,
    });

    const logs = await getSandboxAdapter().readLogs(preview.workspaceId).catch(() => []);
    getPreviewProgressStore().markReady(buildId, logs);

    return NextResponse.json(
      { preview: { url: preview.url, expiresAt: preview.expiresAt, revisionNumber: preview.revisionNumber } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MissingSectionsError) {
      return NextResponse.json(
        {
          error: `Approve these stages before starting a preview: ${error.missing.join(", ")}.`,
          missingSections: error.missing,
        },
        { status: 409 },
      );
    }
    if (error instanceof BuildNotFoundError) {
      return NextResponse.json({ error: "Build not found." }, { status: 404 });
    }

    console.error("[preview] Failed to start sandbox preview", error);

    const progress = getPreviewProgressStore().get(buildId);
    const workspaceId = progress?.workspaceId ?? null;
    const logs = workspaceId ? await getSandboxAdapter().readLogs(workspaceId).catch(() => []) : [];
    getPreviewProgressStore().markFailed(buildId, "The preview server failed to start.", logs);
    if (workspaceId) {
      // Best-effort teardown so a retry never stacks a second live sandbox on a dead one.
      await getSandboxAdapter().destroyWorkspace(workspaceId).catch(() => {});
    }

    return NextResponse.json({ error: "Could not start the preview sandbox." }, { status: 502 });
  }
}

/**
 * Read the active preview's metadata, if any.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record, one owned by another founder, or no active preview.
 * - 200 with the preview url/expiresAt otherwise.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view this preview." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const preview = getPreviewStore().getActive(buildId, new Date());
  if (!preview) {
    return NextResponse.json({ error: "No active preview for this build." }, { status: 404 });
  }

  return NextResponse.json(
    { preview: { url: preview.url, expiresAt: preview.expiresAt, revisionNumber: preview.revisionNumber } },
    { status: 200 },
  );
}
