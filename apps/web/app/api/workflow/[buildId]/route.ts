import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Workflow SSE placeholder. Wire this route to stream stage events from @launchblitz/workflow.",
  });
}
