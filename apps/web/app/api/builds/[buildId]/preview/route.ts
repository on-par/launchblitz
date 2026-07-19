import { NextResponse } from "next/server";
import { startStaticSitePreview, DEFAULT_PREVIEW_TTL_MS, type SandboxFile, type StaticPreview } from "@launchblitz/sandbox";
import { assembleLaunchPacket, buildLandingPageArtifact, getMissingLandingPageSections } from "@launchblitz/workflow";
import { getSession } from "../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../lib/packet-data";
import { getPreviewStore, getSandboxAdapter } from "../../../../../lib/sandbox";

// Constructs the sandbox adapter with real provider credentials — Node.js runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

// Dedupe concurrent starts for the same build: without this, two requests
// that both read "no active preview" before either finishes would each
// provision a separate (billable) sandbox, and the store would only keep
// whichever one's set() call ran last, orphaning the other.
const inFlightPreviews = new Map<string, Promise<StaticPreview>>();

function startPreview(buildId: string, files: SandboxFile[]): Promise<StaticPreview> {
  const pending = inFlightPreviews.get(buildId);
  if (pending) {
    return pending;
  }
  const promise = startStaticSitePreview(getSandboxAdapter(), {
    files,
    label: buildId,
    ttlMs: DEFAULT_PREVIEW_TTL_MS,
    now: new Date(),
  }).finally(() => inFlightPreviews.delete(buildId));
  inFlightPreviews.set(buildId, promise);
  return promise;
}

/**
 * Start (or reuse) a hosted preview of the generated landing page.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 409 when the Copy Deck stage is not yet approved.
 * - 201 with the preview url/expiresAt (200 if one is already active).
 * - 502 if the sandbox provider fails to start the preview.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to start a preview." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const existing = getPreviewStore().getActive(buildId, new Date());
  if (existing) {
    return NextResponse.json({ preview: { url: existing.url, expiresAt: existing.expiresAt } }, { status: 200 });
  }

  const packet = assembleLaunchPacket(await getStageOutputRecords(buildId));

  const missing = getMissingLandingPageSections(packet);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Approve these stages before starting a preview: ${missing.join(", ")}.`,
        missingSections: missing,
      },
      { status: 409 },
    );
  }

  const artifact = buildLandingPageArtifact(packet, { buildId, generatedAt: new Date().toISOString() });
  const files = artifact.files.map((file) => ({ path: file.path, content: file.contents }));

  try {
    const preview = await startPreview(buildId, files);

    getPreviewStore().set({
      buildId,
      workspaceId: preview.workspaceId,
      url: preview.url,
      expiresAt: preview.expiresAt,
    });

    return NextResponse.json({ preview: { url: preview.url, expiresAt: preview.expiresAt } }, { status: 201 });
  } catch (error) {
    console.error("[preview] Failed to start sandbox preview", error);
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

  return NextResponse.json({ preview: { url: preview.url, expiresAt: preview.expiresAt } }, { status: 200 });
}
