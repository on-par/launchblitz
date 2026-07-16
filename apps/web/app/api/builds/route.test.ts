import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSession } from "../../../lib/auth";
import { getBuildsRepository } from "../../../lib/builds";
import { getProviderKeysRepository } from "../../../lib/provider-keys";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Persistence uses the real in-memory repository (no DATABASE_URL in tests).
vi.mock("../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("../../../lib/provider-keys", () => ({
  getProviderKeysRepository: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);
const mockedGetProviderKeysRepository = vi.mocked(getProviderKeysRepository);

function post(body: unknown) {
  return POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function mockReadyProviderKeys() {
  mockedGetProviderKeysRepository.mockReturnValue({
    list: vi.fn().mockResolvedValue([{ id: "row-1", provider: "anthropic", keyHint: "…abcd", createdAt: null, updatedAt: null }]),
    upsert: vi.fn(),
    delete: vi.fn(),
  });
}

beforeEach(() => {
  mockedGetSession.mockReset();
  mockedGetProviderKeysRepository.mockReset();
});

describe("builds route", () => {
  it("POST creates a build tied to the signed-in founder", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockReadyProviderKeys();

    const response = await post({ idea: "  A tax planner for creators  " });
    expect(response.status).toBe(201);
    const data = (await response.json()) as {
      build: { id: string; status: string; currentStage: number; seedIdea: string | null };
    };
    expect(data.build.id).toBeTruthy();
    expect(data.build.status).toBe("active");
    expect(data.build.currentStage).toBe(0);
    expect(data.build.seedIdea).toBe("A tax planner for creators");

    const stored = await getBuildsRepository().getForUser(data.build.id, "user-a");
    expect(stored?.seedIdea).toBe("A tax planner for creators");
  });

  it("POST with empty or non-string idea returns 400 with a founder-facing error", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    const emptyResponse = await post({ idea: "   " });
    expect(emptyResponse.status).toBe(400);
    const emptyData = (await emptyResponse.json()) as { error: string };
    expect(emptyData.error).toBeTruthy();

    const nonStringResponse = await post({ idea: 42 });
    expect(nonStringResponse.status).toBe(400);
  });

  it("POST with malformed JSON body returns 400", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when signed out, without calling the provider keys repository", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await post({ idea: "A tax planner" });
    expect(response.status).toBe(401);
    expect(mockedGetProviderKeysRepository).not.toHaveBeenCalled();
  });

  it("ignores a userId in the body — the session decides ownership", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockReadyProviderKeys();

    const response = await post({ idea: "x", userId: "attacker" });
    expect(response.status).toBe(201);
    const data = (await response.json()) as { build: { id: string } };

    expect(await getBuildsRepository().getForUser(data.build.id, "attacker")).toBeNull();
    const stored = await getBuildsRepository().getForUser(data.build.id, "user-a");
    expect(stored).not.toBeNull();
  });

  it("returns 409 when the founder has no saved Anthropic key, without creating a build", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-missing-key" });
    mockedGetProviderKeysRepository.mockReturnValue({
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      delete: vi.fn(),
    });

    const response = await post({ idea: "A tax planner for creators" });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toContain("key vault");

    const builds = await getBuildsRepository().listForUser("user-missing-key");
    expect(builds).toHaveLength(0);
  });

  it("returns 409 when the founder has revoked their provider key", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-revoked-key" });
    mockedGetProviderKeysRepository.mockReturnValue({
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      delete: vi.fn(),
    });

    const response = await post({ idea: "A tax planner for creators" });

    expect(response.status).toBe(409);

    const builds = await getBuildsRepository().listForUser("user-revoked-key");
    expect(builds).toHaveLength(0);
  });
});
