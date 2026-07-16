import { NextResponse } from "next/server";
import { assembleLaunchPacket, buildLaunchKitArtifact } from "@launchblitz/workflow";
import { getSession } from "../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../../lib/packet-data";

// Ownership checks hit the builds repository (pg driver) — Node.js runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

/**
 * Download the Launch Kit asset as Markdown.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 200 with the rendered artifact and a Content-Disposition attachment header otherwise.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to download this launch kit." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const artifact = buildLaunchKitArtifact(assembleLaunchPacket(await getStageOutputRecords(buildId)), {
    buildId,
    generatedAt: new Date().toISOString(),
  });

  return new NextResponse(artifact.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="launch-kit-${buildId}.md"`,
    },
  });
}
