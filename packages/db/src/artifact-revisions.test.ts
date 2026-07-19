import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DrizzleArtifactRevisionsRepository,
  EDIT_REQUEST_MAX_LENGTH,
  InMemoryArtifactRevisionsRepository,
  validateEditRequest,
  type ArtifactRevisionArtifact,
} from "./artifact-revisions";
import { DrizzleBuildsRepository } from "./builds";
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

const artifact: ArtifactRevisionArtifact = {
  formatVersion: 1,
  files: [{ path: "index.html", contents: "<html></html>" }],
};

describe("validateEditRequest", () => {
  it("accepts and trims a normal string", () => {
    const result = validateEditRequest("  Make the hero CTA more direct  ");
    expect(result).toEqual({ ok: true, value: "Make the hero CTA more direct" });
  });

  it("rejects a non-string value", () => {
    expect(validateEditRequest(42)).toEqual({
      ok: false,
      error: "Describe the change you want before submitting.",
    });
  });

  it("rejects an empty or whitespace-only string", () => {
    expect(validateEditRequest("").ok).toBe(false);
    expect(validateEditRequest("   ")).toEqual({
      ok: false,
      error: "Describe the change you want before submitting.",
    });
  });

  it("rejects a string longer than the max length", () => {
    const tooLong = "a".repeat(EDIT_REQUEST_MAX_LENGTH + 1);
    expect(validateEditRequest(tooLong)).toEqual({
      ok: false,
      error: `Keep your change request under ${EDIT_REQUEST_MAX_LENGTH} characters.`,
    });
  });
});

describe("InMemoryArtifactRevisionsRepository", () => {
  it("numbers revisions sequentially per build, keeping history intact", async () => {
    const repo = new InMemoryArtifactRevisionsRepository();

    const first = await repo.createForUser(
      { buildId: "build-a", editRequest: null, artifact },
      "user-a",
    );
    expect(first?.revisionNumber).toBe(1);
    expect(first?.editRequest).toBeNull();

    const second = await repo.createForUser(
      { buildId: "build-a", editRequest: "Make the hero CTA more direct", artifact },
      "user-a",
    );
    expect(second?.revisionNumber).toBe(2);
    expect(second?.editRequest).toBe("Make the hero CTA more direct");

    const history = await repo.listForUser("build-a", "user-a");
    expect(history.map((r) => r.revisionNumber)).toEqual([1, 2]);
    expect(history[0].editRequest).toBeNull();
    expect(history[1].editRequest).toBe("Make the hero CTA more direct");

    const latest = await repo.getLatestForUser("build-a", "user-a");
    expect(latest?.revisionNumber).toBe(2);
  });

  it("does not let another user create, read, or list a build's revisions (ownership)", async () => {
    const repo = new InMemoryArtifactRevisionsRepository();
    await repo.createForUser({ buildId: "build-a", editRequest: null, artifact }, "user-a");

    expect(
      await repo.createForUser({ buildId: "build-a", editRequest: "hijacked", artifact }, "user-b"),
    ).toBeNull();
    expect(await repo.getLatestForUser("build-a", "user-b")).toBeNull();
    expect(await repo.listForUser("build-a", "user-b")).toEqual([]);
  });
});

describe("DrizzleArtifactRevisionsRepository (PGlite)", () => {
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

  it("creates, lists, and fetches the latest revision for the owning build", async () => {
    const buildsRepo = new DrizzleBuildsRepository(db);
    const build = await buildsRepo.create({ userId: "user-a", seedIdea: "Tax tooling for creators" });

    const repo = new DrizzleArtifactRevisionsRepository(db);
    const first = await repo.createForUser(
      { buildId: build.id, editRequest: null, artifact },
      "user-a",
    );
    expect(first?.revisionNumber).toBe(1);

    const second = await repo.createForUser(
      { buildId: build.id, editRequest: "Make the hero CTA more direct", artifact },
      "user-a",
    );
    expect(second?.revisionNumber).toBe(2);
    expect(second?.editRequest).toBe("Make the hero CTA more direct");

    const history = await repo.listForUser(build.id, "user-a");
    expect(history.map((r) => r.revisionNumber)).toEqual([1, 2]);

    const latest = await repo.getLatestForUser(build.id, "user-a");
    expect(latest?.revisionNumber).toBe(2);
    expect(latest?.artifact).toEqual(artifact);
  });

  it("does not let another founder create, read, or list a build's revisions (ownership)", async () => {
    const buildsRepo = new DrizzleBuildsRepository(db);
    const build = await buildsRepo.create({ userId: "user-a", seedIdea: "Tax tooling for creators" });

    const repo = new DrizzleArtifactRevisionsRepository(db);
    await repo.createForUser({ buildId: build.id, editRequest: null, artifact }, "user-a");

    expect(
      await repo.createForUser({ buildId: build.id, editRequest: "hijacked", artifact }, "user-b"),
    ).toBeNull();
    expect(await repo.getLatestForUser(build.id, "user-b")).toBeNull();
    expect(await repo.listForUser(build.id, "user-b")).toEqual([]);
  });

  it("returns null/[] for a non-uuid buildId without querying (avoids a Postgres uuid cast error)", async () => {
    const repo = new DrizzleArtifactRevisionsRepository(db);
    expect(await repo.createForUser({ buildId: "not-a-uuid", editRequest: null, artifact }, "user-a")).toBeNull();
    expect(await repo.getLatestForUser("not-a-uuid", "user-a")).toBeNull();
    expect(await repo.listForUser("not-a-uuid", "user-a")).toEqual([]);
  });
});
