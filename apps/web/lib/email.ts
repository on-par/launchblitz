import { Resend } from "resend";

export interface EmailSender {
  sendWaitlistConfirmation(email: string): Promise<void>;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Survive Next.js dev/HMR module reloads, same rationale as apps/web/lib/builds.ts.
const globalStore = globalThis as typeof globalThis & {
  __launchblitzEmailSender?: EmailSender;
};

/** Resend-backed sender used when RESEND_API_KEY is configured. */
class ResendEmailSender implements EmailSender {
  private client: Resend | undefined;

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(process.env.RESEND_API_KEY);
    }
    return this.client;
  }

  async sendWaitlistConfirmation(email: string): Promise<void> {
    // onboarding@resend.dev is Resend's default sandbox-verified sender.
    // Swapping to a verified project domain is a fast-follow.
    const { error } = await this.getClient().emails.send({
      from: "LaunchBlitz <onboarding@resend.dev>",
      to: email,
      subject: "You're on the LaunchBlitz waitlist",
      text: "Thanks for joining — you're on the list. We'll email you when it's your turn.",
    });
    // The Resend SDK resolves (rather than rejects) on API-level failures
    // (bad key, unverified domain, suppressed recipient) — throw so the
    // route's existing catch/log handling covers this case too.
    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
  }
}

/**
 * Deliberately not gated to non-production, unlike waitlist.ts's fail-closed
 * repository: a missing email vendor key is not a reason to break signups,
 * so this warns and no-ops in every environment, including production.
 */
class NoopEmailSender implements EmailSender {
  private warned = false;

  async sendWaitlistConfirmation(): Promise<void> {
    if (!this.warned) {
      console.warn(
        "[email] RESEND_API_KEY is not set — waitlist confirmation emails will not be sent.",
      );
      this.warned = true;
    }
  }
}

/**
 * Resolve the email sender:
 * - Resend-backed when RESEND_API_KEY is configured.
 * - Otherwise a no-op sender in every environment — a Resend outage or
 *   missing key should never break a waitlist signup.
 */
export function getEmailSender(): EmailSender {
  if (!globalStore.__launchblitzEmailSender) {
    globalStore.__launchblitzEmailSender = isEmailConfigured() ? new ResendEmailSender() : new NoopEmailSender();
  }
  return globalStore.__launchblitzEmailSender;
}
