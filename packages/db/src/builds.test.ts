import { describe, expect, it } from "vitest";
import {
  DrizzleBuildsRepository,
  INITIAL_BUILD_STATUS,
  InMemoryBuildsRepository,
  SEED_IDEA_MAX_LENGTH,
  validateSeedIdea,
} from "./builds";
import type { Db } from "./provider-keys/repository";

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
});
