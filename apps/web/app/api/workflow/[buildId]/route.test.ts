import { describe, expect, it, vi } from "vitest";

const { runFirstStageMock, parseRunStageBodyMock, getSessionMock } = vi.hoisted(() => ({
  runFirstStageMock: vi.fn(),
  parseRunStageBodyMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock("../../../../lib/auth", () => ({
  getSession: getSessionMock,
}));

vi.mock("../../../../lib/db", () => ({
  getDb: () => ({}),
}));

vi.mock("@launchblitz/db", () => ({
  getBuildForUser: vi.fn(),
  updateBuild: vi.fn(),
  upsertStageOutput: vi.fn(),
}));

vi.mock("@launchblitz/workflow", async (importActual) => {
  const actual = await importActual<typeof import("@launchblitz/workflow")>();
  return {
    ...actual,
    parseRunStageBody: parseRunStageBodyMock,
    runFirstStage: runFirstStageMock,
  };
});

const { POST } = await import("./route");

const VALID_BUILD_ID = "11111111-1111-1111-1111-111111111111";

function makeRequest(body: unknown = { idea: "a laundry app" }) {
  return new Request(`http://localhost/api/workflow/${VALID_BUILD_ID}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeParams(buildId = VALID_BUILD_ID) {
  return { params: Promise.resolve({ buildId }) };
}

describe("POST /api/workflow/[buildId]", () => {
  it("returns 401 when signed out", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(401);
    expect(runFirstStageMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a non-UUID buildId", async () => {
    getSessionMock.mockResolvedValueOnce({ userId: "user-1" });

    const response = await POST(makeRequest(), makeParams("demo"));

    expect(response.status).toBe(404);
    expect(runFirstStageMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the body fails validation", async () => {
    getSessionMock.mockResolvedValueOnce({ userId: "user-1" });
    parseRunStageBodyMock.mockReturnValueOnce({ ok: false, message: "idea must be a string." });

    const response = await POST(makeRequest({ idea: 42 }), makeParams());
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "idea must be a string." });
    expect(runFirstStageMock).not.toHaveBeenCalled();
  });

  it("passes the session's userId and the parsed idea to runFirstStage, and maps success to 200", async () => {
    getSessionMock.mockResolvedValueOnce({ userId: "user-1" });
    parseRunStageBodyMock.mockReturnValueOnce({ ok: true, idea: "a laundry app" });
    runFirstStageMock.mockResolvedValueOnce({
      ok: true,
      output: { name: "LaundryPal" },
      provider: "anthropic",
      model: "claude-opus-4-8",
    });

    const response = await POST(makeRequest({ idea: "a laundry app" }), makeParams());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ output: { name: "LaundryPal" }, provider: "anthropic", model: "claude-opus-4-8" });
    expect(runFirstStageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ buildId: VALID_BUILD_ID, userId: "user-1", idea: "a laundry app" }),
    );
  });

  it("maps not_found to 404", async () => {
    getSessionMock.mockResolvedValueOnce({ userId: "user-1" });
    parseRunStageBodyMock.mockReturnValueOnce({ ok: true, idea: "a laundry app" });
    runFirstStageMock.mockResolvedValueOnce({ ok: false, code: "not_found", message: "Build not found." });

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(404);
  });

  it("maps missing_idea to 400", async () => {
    getSessionMock.mockResolvedValueOnce({ userId: "user-1" });
    parseRunStageBodyMock.mockReturnValueOnce({ ok: true, idea: undefined });
    runFirstStageMock.mockResolvedValueOnce({
      ok: false,
      code: "missing_idea",
      message: "No idea text to capture.",
    });

    const response = await POST(makeRequest({}), makeParams());

    expect(response.status).toBe(400);
  });

  it("maps stage_failed to 502", async () => {
    getSessionMock.mockResolvedValueOnce({ userId: "user-1" });
    parseRunStageBodyMock.mockReturnValueOnce({ ok: true, idea: "a laundry app" });
    runFirstStageMock.mockResolvedValueOnce({
      ok: false,
      code: "stage_failed",
      message: "Anthropic request failed",
    });

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(502);
  });
});
