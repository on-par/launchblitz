import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSession } from "../../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../../lib/packet-data";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Ownership uses the real in-memory builds repository (no DATABASE_URL in tests).
vi.mock("../../../../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

// The demo packet-data seam leaves copy-deck unapproved; drive it per-case so
// both the blocked and generatable paths are exercised.
vi.mock("../../../../../../lib/packet-data", () => ({
  getStageOutputRecords: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);
const mockedGetStageOutputRecords = vi.mocked(getStageOutputRecords);

async function ownedBuild(userId: string) {
  return getBuildsRepository().create({ userId, seedIdea: "Tax tooling for creators" });
}

function get(buildId: string) {
  return GET(new Request(`http://localhost/api/builds/${buildId}/landing-page/export`), {
    params: Promise.resolve({ buildId }),
  });
}

const unapprovedRecords = [
  {
    stageIndex: 4,
    stageName: "copy-deck",
    rawOutput: { headline: "Draft headline pending review" },
    editedOutput: null,
    approvedAt: null,
  },
];

const approvedRecords = [
  {
    stageIndex: 4,
    stageName: "copy-deck",
    rawOutput: null,
    editedOutput: { headline: "Creator tax tooling, finally simple" },
    approvedAt: new Date("2026-07-10T10:00:00Z"),
  },
];

beforeEach(() => {
  mockedGetSession.mockReset();
  mockedGetStageOutputRecords.mockReset();
  mockedGetStageOutputRecords.mockResolvedValue(unapprovedRecords);
});

describe("landing page export route", () => {
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

  it("returns 409 when copy-deck is not approved", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(unapprovedRecords);
    const build = await ownedBuild("user-a");

    const response = await get(build.id);
    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Type")).not.toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBeNull();

    const body = await response.json();
    expect(body.error).toContain("Copy Deck");
    expect(body.missingSections).toEqual(["Copy Deck"]);
  });

  it("returns a ZIP with index.html when copy-deck is approved", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const response = await get(build.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      `attachment; filename="landing-page-${build.id}.zip"`,
    );

    const unzipped = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const html = Buffer.from(unzipped["index.html"]).toString("utf-8");
    expect(html).toContain("Creator tax tooling, finally simple");
  });
});
