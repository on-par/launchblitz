import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DrizzleWaitlistSignupsRepository,
  EMAIL_MAX_LENGTH,
  InMemoryWaitlistSignupsRepository,
  parseWaitlistSignupInput,
} from "./waitlist";
import { waitlistSignups } from "./schema";
import type { Db } from "./provider-keys/repository";

const DRIZZLE_DIR = join(__dirname, "..", "drizzle");

async function applyMigrations(client: PGlite) {
  const files = readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(DRIZZLE_DIR, file), "utf8");
    const statements = sql.split("--> statement-breakpoint");
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        await client.exec(trimmed);
      }
    }
  }
}

describe("parseWaitlistSignupInput", () => {
  it("accepts a valid email, trimming and lowercasing it", () => {
    const result = parseWaitlistSignupInput({ email: "  Founder@Example.COM  " });
    expect(result).toEqual({ ok: true, value: { email: "founder@example.com" } });
  });

  it("rejects a non-object body", () => {
    expect(parseWaitlistSignupInput(null).ok).toBe(false);
    expect(parseWaitlistSignupInput("founder@example.com").ok).toBe(false);
    expect(parseWaitlistSignupInput(["founder@example.com"]).ok).toBe(false);
  });

  it("rejects a body missing the email key", () => {
    const result = parseWaitlistSignupInput({});
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects a body with an unknown field alongside a valid email", () => {
    const result = parseWaitlistSignupInput({ email: "founder@example.com", admin: true });
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects a non-string email", () => {
    const result = parseWaitlistSignupInput({ email: 42 });
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects an empty string", () => {
    const result = parseWaitlistSignupInput({ email: "   " });
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects a string missing the @ symbol", () => {
    const result = parseWaitlistSignupInput({ email: "founderexample.com" });
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects a string missing a domain", () => {
    const result = parseWaitlistSignupInput({ email: "founder@example" });
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects a string longer than the max length", () => {
    const tooLong = `${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`;
    const result = parseWaitlistSignupInput({ email: tooLong });
    expect(result).toEqual({ ok: false, error: "invalid_email" });
  });
});

describe("InMemoryWaitlistSignupsRepository", () => {
  it("returns wasNew: true for a fresh email and wasNew: false for a repeat", async () => {
    const repo = new InMemoryWaitlistSignupsRepository();

    expect(await repo.create("founder@example.com")).toEqual({ wasNew: true });
    expect(await repo.create("founder@example.com")).toEqual({ wasNew: false });
  });
});

describe("DrizzleWaitlistSignupsRepository (PGlite)", () => {
  let client: PGlite;
  let db: Db;

  beforeEach(async () => {
    client = new PGlite();
    await applyMigrations(client);
    db = drizzle(client);
  });

  afterEach(async () => {
    await client.close();
  });

  it("inserts a new email and returns wasNew: true", async () => {
    const repo = new DrizzleWaitlistSignupsRepository(db);
    expect(await repo.create("founder@example.com")).toEqual({ wasNew: true });
  });

  it("returns wasNew: false for a duplicate email and keeps exactly one row", async () => {
    const repo = new DrizzleWaitlistSignupsRepository(db);

    await repo.create("founder@example.com");
    const second = await repo.create("founder@example.com");
    expect(second).toEqual({ wasNew: false });

    const rows = await db
      .select()
      .from(waitlistSignups)
      .where(eq(waitlistSignups.email, "founder@example.com"));
    expect(rows).toHaveLength(1);
  });
});
