import { NextResponse } from "next/server";
import {
  assembleLaunchPacket,
  buildLandingPageArtifact,
  buildLandingPageZip,
  getMissingLandingPageSections,
} from "@launchblitz/workflow";
import { getSession } from "../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../../lib/packet-data";

// Ownership checks hit the builds repository (pg driver) — Node.js runtime.
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ buildId: string }>;
}

/**
 * Download the generated static landing page as a ZIP.
 * - 401 when there is no authenticated founder.
 * - 404 for a missing record or one owned by another founder (deliberately
 *   identical — no ownership enumeration).
 * - 409 when the Copy Deck stage is not yet approved.
 * - 200 with the ZIP artifact and a Content-Disposition attachment header otherwise.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to download this landing page." }, { status: 401 });
  }

  const { buildId } = await params;
  const build = await getBuildsRepository().getForUser(buildId, session.userId);
  if (!build) {
    return NextResponse.json({ error: "Build not found." }, { status: 404 });
  }

  const packet = assembleLaunchPacket(await getStageOutputRecords(buildId));

  const missing = getMissingLandingPageSections(packet);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Approve these stages before generating the landing page: ${missing.join(", ")}.`,
        missingSections: missing,
      },
      { status: 409 },
    );
  }

  const zip = buildLandingPageZip(buildLandingPageArtifact(packet, { buildId, generatedAt: new Date().toISOString() }));

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="landing-page-${buildId}.zip"`,
    },
  });
}
