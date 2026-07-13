import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "./client";
import {
  createBuild,
  getBuildForUser,
  getStageOutput,
  updateBuild,
  upsertStageOutput,
} from "./repository";
import * as schema from "./schema";

// pglite and node-postgres both implement drizzle's node-postgres-flavored query
// interface, so this structural cast is safe for tests; the real app always
// uses createDb() (node-postgres) via the Database type.
let db: Database;

beforeAll(async () => {
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as Database;
});

describe("createBuild / getBuildForUser", () => {
  it("round-trips a build for its owner", async () => {
    const created = await createBuild(db, { userId: "user-1", seedIdea: "a laundry app" });
    expect(created.status).toBe("created");
    expect(created.currentStage).toBe(0);

    const found = await getBuildForUser(db, created.id, "user-1");
    expect(found?.id).toBe(created.id);
    expect(found?.seedIdea).toBe("a laundry app");
  });

  it("returns undefined for the wrong user", async () => {
    const created = await createBuild(db, { userId: "user-2" });
    const found = await getBuildForUser(db, created.id, "someone-else");
    expect(found).toBeUndefined();
  });
});

describe("upsertStageOutput", () => {
  it("inserts then overwrites on a second call for the same buildId/stageIndex", async () => {
    const build = await createBuild(db, { userId: "user-3" });

    const first = await upsertStageOutput(db, {
      buildId: build.id,
      stageIndex: 1,
      stageName: "idea-capture",
      rawOutput: { name: "First" },
      provider: "anthropic",
      model: "claude-opus-4-8",
      status: "complete",
    });
    expect(first.rawOutput).toEqual({ name: "First" });
    expect(first.provider).toBe("anthropic");
    expect(first.status).toBe("complete");

    const second = await upsertStageOutput(db, {
      buildId: build.id,
      stageIndex: 1,
      stageName: "idea-capture",
      rawOutput: { name: "Second" },
      provider: "anthropic",
      model: "claude-opus-4-8",
      status: "complete",
    });
    expect(second.id).toBe(first.id);
    expect(second.rawOutput).toEqual({ name: "Second" });

    const stored = await getStageOutput(db, build.id, 1);
    expect(stored?.rawOutput).toEqual({ name: "Second" });
  });
});

describe("updateBuild", () => {
  it("sets status and currentStage", async () => {
    const build = await createBuild(db, { userId: "user-4" });
    const updated = await updateBuild(db, build.id, { status: "in_progress", currentStage: 1 });
    expect(updated.status).toBe("in_progress");
    expect(updated.currentStage).toBe(1);
  });
});
