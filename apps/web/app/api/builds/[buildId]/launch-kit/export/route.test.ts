import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSession } from "../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../lib/builds";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Ownership uses the real in-memory builds repository (no DATABASE_URL in tests).
vi.mock("../../../../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);

async function ownedBuild(userId: string) {
  return getBuildsRepository().create({ userId, seedIdea: "Tax tooling for creators" });
}

function get(buildId: string) {
  return GET(new Request(`http://localhost/api/builds/${buildId}/launch-kit/export`), {
    params: Promise.resolve({ buildId }),
  });
}

beforeEach(() => {
  mockedGetSession.mockReset();
});

describe("launch kit export route", () => {
  it("returns 401 when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    const build = await ownedBuild("user-a");

    expect((await get(build.id)).status).toBe(401);
  });

  it("returns 404 when signed in as a different user (ownership)", async () => {
    const build = await ownedBuild("user-a");

    mockedGetSession.mockResolvedValue({ userId: "user-b" });
    expect((await get(build.id)).status).toBe(404);
  });

  it("returns 404 for an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    expect((await get(crypto.randomUUID())).status).toBe(404);
  });

  it("returns markdown for the owner with readiness checklist", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await get(build.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/^text\/markdown/);
    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="launch-kit-${build.id}.md"`,
    );

    const body = await response.text();
    expect(body).toContain("# Launch Kit");
    expect(body).toContain("- [x] Market Validation");
    expect(body).toContain("- [ ] Launch Kit");
  });
});
