import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    providers: ["openai", "anthropic", "perplexity", "exploding-topics", "jasper", "lovable", "tidio"],
  });
}
