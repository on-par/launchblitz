import { waitlistSignups } from "./schema";
import type { Db } from "./provider-keys/repository";

export const EMAIL_MAX_LENGTH = 254;

const EMAIL_SHAPE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedWaitlistSignupInput =
  | { ok: true; value: { email: string } }
  | { ok: false; error: "invalid_email" };

/**
 * Validate and normalize a waitlist signup request body. Rejects unknown
 * fields alongside `email` in the same check as a missing `email`, and
 * normalizes case/whitespace so `A@b.com` and `a@b.com` are the same signup.
 */
export function parseWaitlistSignupInput(body: unknown): ParsedWaitlistSignupInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_email" };
  }

  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== "email") {
    return { ok: false, error: "invalid_email" };
  }

  const rawEmail = (body as { email: unknown }).email;
  if (typeof rawEmail !== "string") {
    return { ok: false, error: "invalid_email" };
  }

  const email = rawEmail.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE_REGEX.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  return { ok: true, value: { email } };
}

/**
 * Persistence boundary for waitlist signups. Implemented by
 * {@link DrizzleWaitlistSignupsRepository} for real Postgres and
 * {@link InMemoryWaitlistSignupsRepository} for tests and local runs without
 * a database configured.
 */
export interface WaitlistSignupsRepository {
  /** Idempotent create: `wasNew` is false when the email was already on the list. */
  create(email: string): Promise<{ wasNew: boolean }>;
}

/** Drizzle/Postgres-backed repository used at runtime when DATABASE_URL is set. */
export class DrizzleWaitlistSignupsRepository implements WaitlistSignupsRepository {
  constructor(private readonly db: Db) {}

  async create(email: string): Promise<{ wasNew: boolean }> {
    const rows = await this.db
      .insert(waitlistSignups)
      .values({ email })
      .onConflictDoNothing({ target: waitlistSignups.email })
      .returning({ id: waitlistSignups.id });
    return { wasNew: rows.length > 0 };
  }
}

/**
 * In-memory repository. Backs tests and local/e2e runs without a database.
 */
export class InMemoryWaitlistSignupsRepository implements WaitlistSignupsRepository {
  private readonly emails = new Set<string>();

  async create(email: string): Promise<{ wasNew: boolean }> {
    if (this.emails.has(email)) {
      return { wasNew: false };
    }
    this.emails.add(email);
    return { wasNew: true };
  }
}
