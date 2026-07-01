import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getCurrentUserId } from "../../../lib/auth";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Persistence uses the real in-memory repository (no DATABASE_URL in tests).
vi.mock("../../../lib/auth", () => ({
  getCurrentUserId: vi.fn(),
}));

const mockedGetCurrentUserId = vi.mocked(getCurrentUserId);

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/builds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  mockedGetCurrentUserId.mockReset();
});

describe("POST /api/builds", () => {
  it("creates a build tied to the current user", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-a");

    const response = await post({ seedIdea: "  A hot sauce subscription box  " });
    expect(response.status).toBe(201);

    const data = (await response.json()) as {
      build: { id: string; userId: string; status: string; currentStage: number; seedIdea: string };
    };
    expect(data.build.id).toBeTruthy();
    expect(data.build.userId).toBe("user-a");
    expect(data.build.status).toBe("active");
    expect(data.build.currentStage).toBe(0);
    expect(data.build.seedIdea).toBe("A hot sauce subscription box");
  });

  it("rejects an empty idea with 400 and guidance", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-a");

    const response = await post({ seedIdea: "" });
    expect(response.status).toBe(400);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBeTruthy();
  });

  it("rejects a too-short idea with 400", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-a");

    const response = await post({ seedIdea: "short" });
    expect(response.status).toBe(400);
  });

  it("returns 401 when there is no authenticated founder", async () => {
    mockedGetCurrentUserId.mockResolvedValue(null);

    const response = await post({ seedIdea: "A perfectly valid idea" });
    expect(response.status).toBe(401);
  });
});
