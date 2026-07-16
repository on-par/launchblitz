import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DrizzleBuildsRepository,
  INITIAL_BUILD_STATUS,
  InMemoryBuildsRepository,
  SEED_IDEA_MAX_LENGTH,
  validateSeedIdea,
} from "./builds";
import { builds } from "./schema";
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

describe("validateSeedIdea", () => {
  it("accepts and trims a normal string", () => {
    const result = validateSeedIdea("  A tax planner for creators  ");
    expect(result).toEqual({ ok: true, value: "A tax planner for creators" });
  });

  it("rejects a non-string value", () => {
    const result = validateSeedIdea(42);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it("rejects an empty or whitespace-only string", () => {
    expect(validateSeedIdea("").ok).toBe(false);
    expect(validateSeedIdea("   ").ok).toBe(false);
  });

  it("rejects a string longer than the max length", () => {
    const tooLong = "a".repeat(SEED_IDEA_MAX_LENGTH + 1);
    const result = validateSeedIdea(tooLong);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe("InMemoryBuildsRepository", () => {
  it("creates a record with the given userId/seedIdea, initial status, stage, and a uuid id", async () => {
    const repo = new InMemoryBuildsRepository();
    const record = await repo.create({ userId: "user-a", seedIdea: "A tax planner" });

    expect(record.userId).toBe("user-a");
    expect(record.seedIdea).toBe("A tax planner");
    expect(record.status).toBe(INITIAL_BUILD_STATUS);
    expect(record.currentStage).toBe(0);
    expect(record.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("returns the record for the owner and null for another user (ownership)", async () => {
    const repo = new InMemoryBuildsRepository();
    const record = await repo.create({ userId: "user-a", seedIdea: "A tax planner" });

    expect(await repo.getForUser(record.id, "user-a")).toEqual(record);
    expect(await repo.getForUser(record.id, "user-b")).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    const repo = new InMemoryBuildsRepository();
    expect(await repo.getForUser(crypto.randomUUID(), "user-a")).toBeNull();
  });

  describe("listForUser", () => {
    it("returns an empty array for a founder with no builds", async () => {
      const repo = new InMemoryBuildsRepository();
      expect(await repo.listForUser("user-a")).toEqual([]);
    });

    it("scopes results to the calling founder", async () => {
      const repo = new InMemoryBuildsRepository();
      const a = await repo.create({ userId: "user-a", seedIdea: "A tax planner" });
      await repo.create({ userId: "user-b", seedIdea: "A pet supplement store" });

      const results = await repo.listForUser("user-a");
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(a);
    });

    it("orders results most-recently-updated first", async () => {
      vi.useFakeTimers();
      try {
        const repo = new InMemoryBuildsRepository();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
        const first = await repo.create({ userId: "user-a", seedIdea: "First idea" });
        vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
        const second = await repo.create({ userId: "user-a", seedIdea: "Second idea" });

        const results = await repo.listForUser("user-a");
        expect(results.map((r) => r.id)).toEqual([second.id, first.id]);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe("DrizzleBuildsRepository", () => {
  it("returns null for a non-uuid buildId without querying (avoids a Postgres uuid cast error)", async () => {
    const throwingDb = {
      select() {
        throw new Error("should not query the database for a non-uuid id");
      },
    } as unknown as Db;
    const repo = new DrizzleBuildsRepository(throwingDb);

    await expect(repo.getForUser("not-a-uuid", "user-a")).resolves.toBeNull();
  });

  describe("listForUser (PGlite)", () => {
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

    it("scopes to the requesting user, orders newest-updated first, and round-trips updatedAt as a Date", async () => {
      const repo = new DrizzleBuildsRepository(db);
      const a1 = await repo.create({ userId: "user-a", seedIdea: "First idea" });
      const a2 = await repo.create({ userId: "user-a", seedIdea: "Second idea" });
      await repo.create({ userId: "user-b", seedIdea: "Someone else's idea" });

      await db
        .update(builds)
        .set({ updatedAt: new Date("2026-01-01T00:00:00Z") })
        .where(eq(builds.id, a1.id));
      await db
        .update(builds)
        .set({ updatedAt: new Date("2026-01-02T00:00:00Z") })
        .where(eq(builds.id, a2.id));

      const results = await repo.listForUser("user-a");
      expect(results.map((r) => r.id)).toEqual([a2.id, a1.id]);
      expect(results[0].updatedAt).toBeInstanceOf(Date);
      expect(results[0].updatedAt?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
    });

    it("returns an empty array for a founder with no builds", async () => {
      const repo = new DrizzleBuildsRepository(db);
      expect(await repo.listForUser("user-with-none")).toEqual([]);
    });
  });
});
