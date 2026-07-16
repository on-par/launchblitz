import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSession } from "../../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../../lib/builds";
import { getStageOutputsRepository } from "../../../../../../../lib/stage-outputs";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Persistence uses the real in-memory repositories (no DATABASE_URL in tests).
vi.mock("../../../../../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);

function params(buildId: string, stageIndex: number | string) {
  return { params: Promise.resolve({ buildId, stageIndex: String(stageIndex) }) };
}

function approve(buildId: string, stageIndex: number | string) {
  return POST(new Request("http://localhost", { method: "POST" }), params(buildId, stageIndex));
}

beforeEach(() => {
  mockedGetSession.mockReset();
});

describe("stage output approve route", () => {
  it("approves stage 0 (the current stage) and advances the build's currentStage", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw" },
      "user-a",
    );

    const response = await approve(build.id, 0);
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      stageOutput: { approvedAt: string | null };
      build: { currentStage: number };
    };
    expect(data.stageOutput.approvedAt).toEqual(expect.any(String));
    expect(data.build.currentStage).toBe(1);

    const persisted = await getBuildsRepository().getForUser(build.id, "user-a");
    expect(persisted?.currentStage).toBe(1);
  });

  it("returns 409 and keeps the next stage locked when approving a locked (future) stage", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 1, stageName: "Market validation", rawOutput: "raw" },
      "user-a",
    );

    const response = await approve(build.id, 1);
    expect(response.status).toBe(409);

    const persistedBuild = await getBuildsRepository().getForUser(build.id, "user-a");
    expect(persistedBuild?.currentStage).toBe(0);

    const persistedOutput = await getStageOutputsRepository().getForUser(build.id, 1, "user-a");
    expect(persistedOutput?.approvedAt).toBeNull();
  });

  it("re-approving stage 0 after advancing to stage 1 keeps currentStage at 1 (no regression)", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw" },
      "user-a",
    );

    await approve(build.id, 0);
    const response = await approve(build.id, 0);
    expect(response.status).toBe(200);
    const data = (await response.json()) as { build: { currentStage: number } };
    expect(data.build.currentStage).toBe(1);
  });

  it("returns 401 when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    expect((await approve(crypto.randomUUID(), 0)).status).toBe(401);
  });

  it("returns 404 when signed in as a different user (ownership)", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });
    await getStageOutputsRepository().create(
      { buildId: build.id, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw" },
      "user-a",
    );

    mockedGetSession.mockResolvedValue({ userId: "user-b" });
    expect((await approve(build.id, 0)).status).toBe(404);
  });

  it("returns 404 when the stage output has not been generated yet on an owned build", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });

    expect((await approve(build.id, 0)).status).toBe(404);
  });

  it("returns 404 for an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    expect((await approve(crypto.randomUUID(), 0)).status).toBe(404);
  });

  it("returns 404 for a stageIndex beyond the Postgres int4 range instead of erroring", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await getBuildsRepository().create({ userId: "user-a", seedIdea: "An idea" });

    expect((await approve(build.id, "9999999999")).status).toBe(404);
  });
});
