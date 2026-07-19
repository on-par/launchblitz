import { EDIT_REQUEST_MAX_LENGTH } from "@launchblitz/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getSession } from "../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getStageOutputRecords } from "../../../../../lib/packet-data";

// Isolate the route from real auth so we can drive authenticated / unauthenticated
// cases. Ownership uses the real in-memory builds repository (no DATABASE_URL in tests).
vi.mock("../../../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

// The demo packet-data seam leaves copy-deck unapproved; drive it per-case so
// both the blocked and generatable paths are exercised.
vi.mock("../../../../../lib/packet-data", () => ({
  getStageOutputRecords: vi.fn(),
}));

const mockedGetSession = vi.mocked(getSession);
const mockedGetStageOutputRecords = vi.mocked(getStageOutputRecords);

async function ownedBuild(userId: string) {
  return getBuildsRepository().create({ userId, seedIdea: "Tax tooling for creators" });
}

function post(buildId: string, body?: unknown) {
  return POST(
    new Request(`http://localhost/api/builds/${buildId}/artifact-revisions`, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    { params: Promise.resolve({ buildId }) },
  );
}

function get(buildId: string) {
  return GET(new Request(`http://localhost/api/builds/${buildId}/artifact-revisions`), {
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

describe("build artifact-revisions route", () => {
  it("returns 401 for POST when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    const build = await ownedBuild("user-a");

    expect((await post(build.id, { request: "Make the hero CTA more direct" })).status).toBe(401);
  });

  it("returns 401 for GET when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    const build = await ownedBuild("user-a");

    expect((await get(build.id)).status).toBe(401);
  });

  it("returns 404 for POST on an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    expect((await post(crypto.randomUUID(), { request: "Change it" })).status).toBe(404);
  });

  it("returns 404 for GET on an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    expect((await get(crypto.randomUUID())).status).toBe(404);
  });

  it("returns 404 when a different founder requests another founder's revisions", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    mockedGetSession.mockResolvedValue({ userId: "user-b" });
    expect((await get(build.id)).status).toBe(404);
    expect((await post(build.id, { request: "Change it" })).status).toBe(404);
  });

  it("returns 400 when the request text is missing", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await post(build.id, {});
    expect(response.status).toBe(400);
  });

  it("returns 400 when the request text is empty", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await post(build.id, { request: "   " });
    expect(response.status).toBe(400);
  });

  it("returns 400 when the request text is too long", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await post(build.id, { request: "a".repeat(EDIT_REQUEST_MAX_LENGTH + 1) });
    expect(response.status).toBe(400);
  });

  it("returns 409 when copy-deck is not approved", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(unapprovedRecords);
    const build = await ownedBuild("user-a");

    const response = await post(build.id, { request: "Make the hero CTA more direct" });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toContain("Copy Deck");
    expect(body.missingSections).toEqual(["Copy Deck"]);
  });

  it("creates the baseline revision plus the requested revision, then lists both in history", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const response = await post(build.id, { request: "Make the hero CTA more direct" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.revision.revisionNumber).toBe(2);
    expect(body.revision.editRequest).toBe("Make the hero CTA more direct");

    const historyResponse = await get(build.id);
    expect(historyResponse.status).toBe(200);
    const historyBody = await historyResponse.json();
    expect(historyBody.revisions).toHaveLength(2);
    expect(historyBody.revisions[0]).toMatchObject({ revisionNumber: 1, editRequest: null });
    expect(historyBody.revisions[1]).toMatchObject({
      revisionNumber: 2,
      editRequest: "Make the hero CTA more direct",
    });
  });

  it("a second edit request yields revision 3", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    await post(build.id, { request: "Make the hero CTA more direct" });
    const second = await post(build.id, { request: "Shorten the footer" });
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.revision.revisionNumber).toBe(3);
  });

  it("returns an empty array from GET when no revisions exist yet", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await get(build.id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.revisions).toEqual([]);
  });
});
