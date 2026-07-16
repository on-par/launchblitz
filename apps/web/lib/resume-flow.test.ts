import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveResumeState } from "@launchblitz/db";
import { POST as approvePost } from "../app/api/builds/[buildId]/stages/[stageIndex]/approve/route";
import { PATCH as editPatch } from "../app/api/builds/[buildId]/stages/[stageIndex]/route";
import { getSession } from "./auth";
import { getBuildsRepository } from "./builds";
import { getStageOutputsRepository } from "./stage-outputs";

// Isolate the routes from real auth so we can drive the leave-and-return
// flow as an authenticated founder. Persistence uses the real in-memory
// repositories (no DATABASE_URL in tests).
vi.mock("./auth", () => ({
  getSession: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);
const STAGE_COUNT = 8;

function params(buildId: string, stageIndex: number) {
  return { params: Promise.resolve({ buildId, stageIndex: String(stageIndex) }) };
}

function approve(buildId: string, stageIndex: number) {
  return approvePost(new Request("http://localhost", { method: "POST" }), params(buildId, stageIndex));
}

function editStage(buildId: string, stageIndex: number, editedContent: string) {
  return editPatch(
    new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editedContent }),
    }),
    params(buildId, stageIndex),
  );
}

beforeEach(() => {
  mockedGetSession.mockReset();
  mockedGetSession.mockResolvedValue({ userId: "user-a" });
});

describe("leave-and-return resume", () => {
  it("resume after approval advances, preserving prior approvals", async () => {
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw 0" },
      "user-a",
    );
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 1, stageName: "Market validation", rawOutput: "raw 1" },
      "user-a",
    );

    expect((await approve(build.id, 0)).status).toBe(200);

    // Reopen the build the way the session page does.
    const records = await getStageOutputsRepository().listForUser(build.id, "user-a");
    const reopened = await getBuildsRepository().getForUser(build.id, "user-a");

    expect(resolveResumeState(records, reopened!.currentStage, STAGE_COUNT)).toEqual({
      stageIndex: 1,
      complete: false,
    });
    expect(records.find((r) => r.stageIndex === 0)?.approvedAt).not.toBeNull();
  });

  it("resume regresses to a stage whose approval was cleared by an edit", async () => {
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw 0" },
      "user-a",
    );
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 1, stageName: "Market validation", rawOutput: "raw 1" },
      "user-a",
    );

    await approve(build.id, 0);
    expect((await approve(build.id, 1)).status).toBe(200);

    const editResponse = await editStage(build.id, 1, "a revised market validation summary");
    expect(editResponse.status).toBe(200);

    const records = await getStageOutputsRepository().listForUser(build.id, "user-a");
    const reopened = await getBuildsRepository().getForUser(build.id, "user-a");

    expect(resolveResumeState(records, reopened!.currentStage, STAGE_COUNT)).toEqual({
      stageIndex: 1,
      complete: false,
    });
    expect(records.find((r) => r.stageIndex === 1)?.editedOutput).toBe(
      "a revised market validation summary",
    );
    expect(records.find((r) => r.stageIndex === 0)?.approvedAt).not.toBeNull();
  });
});
