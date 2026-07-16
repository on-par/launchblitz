import { NextResponse } from "next/server";
import { assembleLaunchPacket, buildPacketJsonArtifact, buildPacketMarkdown } from "@launchblitz/workflow";
import { getSession } from "../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../../lib/packet-data";

// Ownership checks hit the builds repository (pg driver) — Node.js runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

/**
 * Download the launch packet as Markdown or JSON.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 400 for an unsupported `format` query param.
 * - 200 with the rendered artifact and a Content-Disposition attachment header otherwise.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to download this launch packet." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "markdown";
  if (format !== "markdown" && format !== "json") {
    return NextResponse.json({ error: "Choose the markdown or json format." }, { status: 400 });
  }

  const packet = assembleLaunchPacket(await getStageOutputRecords(buildId));
  const meta = { buildId, generatedAt: new Date().toISOString() };

  if (format === "json") {
    return new NextResponse(JSON.stringify(buildPacketJsonArtifact(packet, meta), null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="launch-packet-${buildId}.json"`,
      },
    });
  }

  return new NextResponse(buildPacketMarkdown(packet, meta), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="launch-packet-${buildId}.md"`,
    },
  });
}
