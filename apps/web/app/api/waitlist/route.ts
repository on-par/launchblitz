import { NextResponse } from "next/server";
import { parseWaitlistSignupInput } from "@launchblitz/db";
import { getEmailSender } from "../../../lib/email";
import { getWaitlistSignupsRepository } from "../../../lib/waitlist";

// Database-backed waitlist signups run on the Node.js runtime (pg driver).
export const runtime = "nodejs";

/**
 * Public, unauthenticated waitlist signup. Idempotent: re-signing up with
 * the same email always returns 200 and never re-sends the confirmation
 * email, so the response never leaks whether an email is already on the list.
 */
export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsed = parseWaitlistSignupInput(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { wasNew } = await getWaitlistSignupsRepository().create(parsed.value.email);

  if (wasNew) {
    getEmailSender()
      .sendWaitlistConfirmation(parsed.value.email)
      .catch((error) => {
        console.error("[waitlist] confirmation email failed", error);
      });
  }

  return NextResponse.json({ status: "ok" });
}
