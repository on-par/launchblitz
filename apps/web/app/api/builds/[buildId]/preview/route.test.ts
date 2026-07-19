import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getSession } from "../../../../../lib/auth";
import { getArtifactRevisionsRepository } from "../../../../../lib/artifact-revisions";
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
    new Request(`http://localhost/api/builds/${buildId}/preview`, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    { params: Promise.resolve({ buildId }) },
  );
}

function get(buildId: string) {
  return GET(new Request(`http://localhost/api/builds/${buildId}/preview`), {
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

describe("build preview route", () => {
  it("returns 401 for POST when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    const build = await ownedBuild("user-a");

    expect((await post(build.id)).status).toBe(401);
  });

  it("returns 401 for GET when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    const build = await ownedBuild("user-a");

    expect((await get(build.id)).status).toBe(401);
  });

  it("returns 404 for POST on an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    expect((await post(crypto.randomUUID())).status).toBe(404);
  });

  it("returns 404 for GET on an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    expect((await get(crypto.randomUUID())).status).toBe(404);
  });

  it("returns 404 when a different founder requests another founder's preview (owner access)", async () => {
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");
    await post(build.id);

    mockedGetSession.mockResolvedValue({ userId: "user-b" });
    expect((await get(build.id)).status).toBe(404);
  });

  it("returns 409 when copy-deck is not approved", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(unapprovedRecords);
    const build = await ownedBuild("user-a");

    const response = await post(build.id);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toContain("Copy Deck");
    expect(body.missingSections).toEqual(["Copy Deck"]);
  });

  it("starts a hosted preview with a future expiresAt when approved", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const response = await post(build.id);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(typeof body.preview.url).toBe("string");
    expect(body.preview.url.length).toBeGreaterThan(0);
    expect(new Date(body.preview.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns the same preview to the owner via GET after POST", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const postBody = await (await post(build.id)).json();
    const getResponse = await get(build.id);
    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json();

    expect(getBody.preview).toEqual(postBody.preview);
  });

  it("returns 404 from GET when no preview has been started", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await get(build.id);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("No active preview");
  });

  it("returns the existing active preview on a second POST instead of starting another workspace", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const first = await (await post(build.id)).json();
    const secondResponse = await post(build.id);
    expect(secondResponse.status).toBe(200);
    const second = await secondResponse.json();

    expect(second.preview).toEqual(first.preview);
  });

  it("dedupes two concurrent POSTs for the same build into a single sandbox", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const [firstResponse, secondResponse] = await Promise.all([post(build.id), post(build.id)]);
    const [first, second] = await Promise.all([firstResponse.json(), secondResponse.json()]);

    expect(first.preview).toEqual(second.preview);
  });

  it("creates baseline revision 1 on the first successful start", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const response = await post(build.id);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.preview.revisionNumber).toBe(1);

    const revisions = await getArtifactRevisionsRepository().listForUser(build.id, "user-a");
    expect(revisions.map((r) => r.revisionNumber)).toEqual([1]);
    expect(revisions[0].editRequest).toBeNull();
  });

  it("returns the same revisionNumber on a second POST without restart", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const first = await (await post(build.id)).json();
    const secondResponse = await post(build.id);
    expect(secondResponse.status).toBe(200);
    const second = await secondResponse.json();

    expect(second.preview.revisionNumber).toBe(first.preview.revisionNumber);
  });

  it("restart serves the latest revision's files and returns its revisionNumber", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const first = await (await post(build.id)).json();
    expect(first.preview.revisionNumber).toBe(1);

    await getArtifactRevisionsRepository().createForUser(
      {
        buildId: build.id,
        editRequest: "Make the hero CTA more direct",
        artifact: { formatVersion: 1, files: [{ path: "index.html", contents: "<html>v2</html>" }] },
      },
      "user-a",
    );

    const restartResponse = await post(build.id, { restart: true });
    expect(restartResponse.status).toBe(201);
    const restartBody = await restartResponse.json();
    expect(restartBody.preview.revisionNumber).toBe(2);
  });
});
