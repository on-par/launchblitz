import { describe, expect, it } from "vitest";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  DrizzleStageOutputsRepository,
  EDITED_CONTENT_MAX_LENGTH,
  InMemoryStageOutputsRepository,
  stageOutputText,
  validateEditedContent,
} from "./stage-outputs";

describe("InMemoryStageOutputsRepository", () => {
  it("creates a record tied to the build with the given stage fields and no edit", async () => {
    const repo = new InMemoryStageOutputsRepository();
    const record = await repo.create(
      { buildId: "build-a", stageIndex: 0, stageName: "Idea capture", rawOutput: { idea: "raw" } },
      "user-a",
    );

    expect(record?.buildId).toBe("build-a");
    expect(record?.stageIndex).toBe(0);
    expect(record?.stageName).toBe("Idea capture");
    expect(record?.rawOutput).toEqual({ idea: "raw" });
    expect(record?.editedOutput).toBeNull();
  });

  it("saves an edit while leaving rawOutput unchanged", async () => {
    const repo = new InMemoryStageOutputsRepository();
    await repo.create(
      { buildId: "build-a", stageIndex: 0, stageName: "Idea capture", rawOutput: "raw text" },
      "user-a",
    );

    const saved = await repo.saveEditForUser("build-a", 0, "user-a", "edited text");
    expect(saved?.editedOutput).toBe("edited text");
    expect(saved?.rawOutput).toBe("raw text");

    const fetched = await repo.getForUser("build-a", 0, "user-a");
    expect(fetched?.editedOutput).toBe("edited text");
    expect(fetched?.rawOutput).toBe("raw text");
  });

  it("returns the latest edit after multiple saves (reload behavior)", async () => {
    const repo = new InMemoryStageOutputsRepository();
    await repo.create(
      { buildId: "build-a", stageIndex: 0, stageName: "Idea capture", rawOutput: "raw" },
      "user-a",
    );

    await repo.saveEditForUser("build-a", 0, "user-a", "first edit");
    await repo.saveEditForUser("build-a", 0, "user-a", "second edit");

    const fetched = await repo.getForUser("build-a", 0, "user-a");
    expect(fetched?.editedOutput).toBe("second edit");
  });

  it("does not let another user read, edit, or list a build's stage outputs (ownership)", async () => {
    const repo = new InMemoryStageOutputsRepository();
    await repo.create(
      { buildId: "build-a", stageIndex: 0, stageName: "Idea capture", rawOutput: "raw" },
      "user-a",
    );

    expect(await repo.getForUser("build-a", 0, "user-b")).toBeNull();
    expect(await repo.saveEditForUser("build-a", 0, "user-b", "hijacked")).toBeNull();
    expect(await repo.listForUser("build-a", "user-b")).toEqual([]);

    // Confirm the non-owner's attempt did not mutate the record.
    const fetched = await repo.getForUser("build-a", 0, "user-a");
    expect(fetched?.editedOutput).toBeNull();
  });

  it("lists only the owner's records for a build, ordered by stageIndex", async () => {
    const repo = new InMemoryStageOutputsRepository();
    await repo.create(
      { buildId: "build-a", stageIndex: 1, stageName: "Market validation", rawOutput: "raw-1" },
      "user-a",
    );
    await repo.create(
      { buildId: "build-a", stageIndex: 0, stageName: "Idea capture", rawOutput: "raw-0" },
      "user-a",
    );
    await repo.create(
      { buildId: "build-b", stageIndex: 0, stageName: "Idea capture", rawOutput: "raw-other" },
      "user-b",
    );

    const forA = await repo.listForUser("build-a", "user-a");
    expect(forA).toHaveLength(2);
    expect(forA.map((record) => record.stageIndex)).toEqual([0, 1]);
  });
});

describe("DrizzleStageOutputsRepository", () => {
  it("returns null for a non-uuid buildId without querying (avoids a Postgres uuid cast error)", async () => {
    const throwingDb = {
      select() {
        throw new Error("should not query the database for a non-uuid id");
      },
    } as unknown as NodePgDatabase;
    const repo = new DrizzleStageOutputsRepository(throwingDb);

    await expect(repo.getForUser("not-a-uuid", 0, "user-a")).resolves.toBeNull();
    await expect(repo.saveEditForUser("not-a-uuid", 0, "user-a", "x")).resolves.toBeNull();
    await expect(repo.listForUser("not-a-uuid", "user-a")).resolves.toEqual([]);
  });
});

describe("validateEditedContent", () => {
  it("accepts and trims a normal string", () => {
    const result = validateEditedContent("  Some edited content  ");
    expect(result).toEqual({ ok: true, value: "Some edited content" });
  });

  it("rejects a non-string value", () => {
    const result = validateEditedContent(42);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty or whitespace-only string", () => {
    expect(validateEditedContent("").ok).toBe(false);
    expect(validateEditedContent("   ").ok).toBe(false);
  });

  it("rejects a string longer than the max length", () => {
    const tooLong = "a".repeat(EDITED_CONTENT_MAX_LENGTH + 1);
    expect(validateEditedContent(tooLong).ok).toBe(false);
  });
});

describe("stageOutputText", () => {
  it("passes a string through as-is", () => {
    expect(stageOutputText("hello")).toBe("hello");
  });

  it("pretty-prints an object", () => {
    expect(stageOutputText({ a: 1 })).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it("returns an empty string for null or undefined", () => {
    expect(stageOutputText(null)).toBe("");
    expect(stageOutputText(undefined)).toBe("");
  });
});
