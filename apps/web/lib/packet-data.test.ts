import { InMemoryStageOutputsRepository, type StageOutputRecord } from "@launchblitz/db";
import { describe, expect, it } from "vitest";
import { getStageOutputRecords, toPacketRecord } from "./packet-data";

describe("getStageOutputRecords", () => {
  it("returns [] for a signed-out session without calling the repository", async () => {
    const repo = new InMemoryStageOutputsRepository();
    await repo.create(
      { buildId: "build-1", stageIndex: 0, stageName: "market-validation", rawOutput: { summary: "ok" } },
      "user-1",
    );

    const records = await getStageOutputRecords("build-1", null, repo);
    expect(records).toEqual([]);
  });

  it("returns [] for a build the user doesn't own, and the mapped records for the owner", async () => {
    const repo = new InMemoryStageOutputsRepository();
    await repo.create(
      { buildId: "build-1", stageIndex: 0, stageName: "market-validation", rawOutput: { summary: "ok" } },
      "user-1",
    );

    const notOwned = await getStageOutputRecords("build-1", "user-2", repo);
    expect(notOwned).toEqual([]);

    const owned = await getStageOutputRecords("build-1", "user-1", repo);
    expect(owned).toEqual([
      {
        stageIndex: 0,
        stageName: "market-validation",
        rawOutput: { summary: "ok" },
        editedOutput: null,
        approvedAt: null,
      },
    ]);
  });
});

describe("toPacketRecord", () => {
  it("maps db fields to the packet shape and drops db-only fields", () => {
    const approvedAt = new Date("2026-07-10T10:00:00Z");
    const dbRecord: StageOutputRecord = {
      id: "output-1",
      buildId: "build-1",
      stageIndex: 3,
      stageName: "copy-deck",
      rawOutput: { headline: "Raw headline" },
      editedOutput: "Founder-edited copy",
      approvedAt,
    };

    const packetRecord = toPacketRecord(dbRecord);

    expect(packetRecord).toEqual({
      stageIndex: 3,
      stageName: "copy-deck",
      rawOutput: { headline: "Raw headline" },
      editedOutput: "Founder-edited copy",
      approvedAt,
    });
    expect(packetRecord).not.toHaveProperty("id");
    expect(packetRecord).not.toHaveProperty("buildId");
  });
});
