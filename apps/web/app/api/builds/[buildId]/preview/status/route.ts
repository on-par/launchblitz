import { NextResponse } from "next/server";
import type { LogEntry, PreviewProgressPhase } from "@launchblitz/sandbox";
import { getSession } from "../../../../../../lib/auth";
import { getArtifactRevisionsRepository } from "../../../../../../lib/artifact-revisions";
import { getBuildsRepository } from "../../../../../../lib/builds";
import { getPreviewProgressStore, getPreviewStore, getSandboxAdapter } from "../../../../../../lib/sandbox";

// Constructs the sandbox adapter with real provider credentials — Node.js runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

type PreviewStatusPhase = PreviewProgressPhase | "idle";

const MAX_LOG_ENTRIES = 50;

function capLogs(logs: LogEntry[]): LogEntry[] {
  return logs.slice(-MAX_LOG_ENTRIES);
}

/**
 * Poll the sandbox preview's startup status for the build page's progress panel.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 200 with `{ status: { phase, logs, url, expiresAt, error, revisionNumber,
 *   latestRevisionNumber, stale } }` otherwise. Staleness/revision fields are
 *   only meaningful while a preview is active — every other branch reports
 *   them as null/false so the response shape stays uniform.
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

  const progress = getPreviewProgressStore().get(buildId);
  const active = getPreviewStore().getActive(buildId, new Date());

  if (active) {
    const latest = await getArtifactRevisionsRepository().getLatestForUser(buildId, session.userId);
    const latestRevisionNumber = latest?.revisionNumber ?? null;
    const stale = latestRevisionNumber !== null && latestRevisionNumber > active.revisionNumber;

    return NextResponse.json({
      status: {
        phase: "ready" satisfies PreviewStatusPhase,
        logs: capLogs(progress?.logs ?? []),
        url: active.url,
        expiresAt: active.expiresAt,
        error: null,
        revisionNumber: active.revisionNumber,
        latestRevisionNumber,
        stale,
      },
    });
  }

  if (!progress || progress.phase === "ready") {
    return NextResponse.json({
      status: {
        phase: "idle" satisfies PreviewStatusPhase,
        logs: [],
        url: null,
        expiresAt: null,
        error: null,
        revisionNumber: null,
        latestRevisionNumber: null,
        stale: false,
      },
    });
  }

  if (progress.phase === "failed") {
    return NextResponse.json({
      status: {
        phase: "failed" satisfies PreviewStatusPhase,
        logs: capLogs(progress.logs),
        url: null,
        expiresAt: null,
        error: progress.error,
        revisionNumber: null,
        latestRevisionNumber: null,
        stale: false,
      },
    });
  }

  const logs = progress.workspaceId
    ? await getSandboxAdapter().readLogs(progress.workspaceId).catch(() => progress.logs)
    : progress.logs;

  return NextResponse.json({
    status: {
      phase: progress.phase satisfies PreviewStatusPhase,
      logs: capLogs(logs),
      url: null,
      expiresAt: null,
      error: null,
      revisionNumber: null,
      latestRevisionNumber: null,
      stale: false,
    },
  });
}
