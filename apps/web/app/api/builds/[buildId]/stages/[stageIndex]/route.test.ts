import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";
import { getSession } from "../../../../../../lib/auth";
import { getStageOutputsRepository } from "../../../../../../lib/stage-outputs";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Persistence uses the real in-memory repository (no DATABASE_URL in tests).
vi.mock("../../../../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);

function params(buildId: string, stageIndex: number | string) {
  return { params: Promise.resolve({ buildId, stageIndex: String(stageIndex) }) };
}

function get(buildId: string, stageIndex: number | string) {
  return GET(new Request("http://localhost"), params(buildId, stageIndex));
}

function patch(buildId: string, stageIndex: number | string, body: unknown) {
  return PATCH(
    new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params(buildId, stageIndex),
  );
}

beforeEach(() => {
  mockedGetSession.mockReset();
});

describe("stage output route", () => {
  it("PATCH saves an edit and preserves the raw output", async () => {
    const buildId = crypto.randomUUID();
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    await getStageOutputsRepository().create(
      { buildId, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw output" },
      "user-a",
    );

    const response = await patch(buildId, 0, { editedContent: "  edited output  " });
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      stageOutput: { rawText: string; editedText: string | null };
    };
    expect(data.stageOutput.editedText).toBe("edited output");
    expect(data.stageOutput.rawText).toBe("raw output");
  });

  it("GET after PATCH returns the latest edit (reload behavior)", async () => {
    const buildId = crypto.randomUUID();
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    await getStageOutputsRepository().create(
      { buildId, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw output" },
      "user-a",
    );

    await patch(buildId, 0, { editedContent: "first edit" });
    await patch(buildId, 0, { editedContent: "second edit" });

    const response = await get(buildId, 0);
    expect(response.status).toBe(200);
    const data = (await response.json()) as { stageOutput: { editedText: string | null } };
    expect(data.stageOutput.editedText).toBe("second edit");
  });

  it("PATCH with empty or non-string editedContent returns 400 with a founder-facing error", async () => {
    const buildId = crypto.randomUUID();
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    await getStageOutputsRepository().create(
      { buildId, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw output" },
      "user-a",
    );

    const emptyResponse = await patch(buildId, 0, { editedContent: "   " });
    expect(emptyResponse.status).toBe(400);
    const emptyData = (await emptyResponse.json()) as { error: string };
    expect(emptyData.error).toBeTruthy();

    const nonStringResponse = await patch(buildId, 0, { editedContent: 42 });
    expect(nonStringResponse.status).toBe(400);
  });

  it("returns 401 for both GET and PATCH when signed out", async () => {
    const buildId = crypto.randomUUID();
    mockedGetSession.mockResolvedValue(null);

    expect((await get(buildId, 0)).status).toBe(401);
    expect((await patch(buildId, 0, { editedContent: "x" })).status).toBe(401);
  });

  it("returns 404 for both GET and PATCH when signed in as a different user (ownership)", async () => {
    const buildId = crypto.randomUUID();
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    await getStageOutputsRepository().create(
      { buildId, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw output" },
      "user-a",
    );

    mockedGetSession.mockResolvedValue({ userId: "user-b" });
    expect((await get(buildId, 0)).status).toBe(404);
    expect((await patch(buildId, 0, { editedContent: "x" })).status).toBe(404);
  });

  it("returns 404 for an unknown buildId/stageIndex", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const buildId = crypto.randomUUID();

    expect((await get(buildId, 0)).status).toBe(404);
    expect((await patch(buildId, 0, { editedContent: "x" })).status).toBe(404);
  });

  it("PATCH after approval clears approvedAt", async () => {
    const buildId = crypto.randomUUID();
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    await getStageOutputsRepository().create(
      { buildId, stageIndex: 0, stageName: "Idea capture", rawOutput: "raw output" },
      "user-a",
    );
    await getStageOutputsRepository().approveForUser(buildId, 0, "user-a");

    const response = await patch(buildId, 0, { editedContent: "edited after approval" });
    expect(response.status).toBe(200);
    const data = (await response.json()) as { stageOutput: { approvedAt: string | null } };
    expect(data.stageOutput.approvedAt).toBeNull();
  });

  it("returns 404 for a stageIndex beyond the Postgres int4 range instead of erroring", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const buildId = crypto.randomUUID();

    expect((await get(buildId, "9999999999")).status).toBe(404);
    expect((await patch(buildId, "9999999999", { editedContent: "x" })).status).toBe(404);
  });
});
