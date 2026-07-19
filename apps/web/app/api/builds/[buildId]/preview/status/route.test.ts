import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { POST } from "../route";
import { getSession } from "../../../../../../lib/auth";
import { getArtifactRevisionsRepository } from "../../../../../../lib/artifact-revisions";
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

const sandboxControl = vi.hoisted(() => ({ failExec: false }));
vi.mock("../../../../../../lib/sandbox", async () => {
  const sandbox = await import("@launchblitz/sandbox");
  const adapter = new sandbox.InMemorySandboxAdapter({
    onExec: () => (sandboxControl.failExec ? { exitCode: 1, stderr: "serve boom" } : {}),
  });
  const previewStore = new sandbox.InMemoryPreviewStore();
  const progressStore = new sandbox.InMemoryPreviewProgressStore();
  return {
    getSandboxAdapter: () => adapter,
    getPreviewStore: () => previewStore,
    getPreviewProgressStore: () => progressStore,
    isSandboxConfigured: () => false,
  };
});

const mockedGetSession = vi.mocked(getSession);
const mockedGetStageOutputRecords = vi.mocked(getStageOutputRecords);

async function ownedBuild(userId: string) {
  return getBuildsRepository().create({ userId, seedIdea: "Tax tooling for creators" });
}

function post(buildId: string) {
  return POST(new Request(`http://localhost/api/builds/${buildId}/preview`, { method: "POST" }), {
    params: Promise.resolve({ buildId }),
  });
}

function getStatus(buildId: string) {
  return GET(new Request(`http://localhost/api/builds/${buildId}/preview/status`), {
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
  sandboxControl.failExec = false;
});

describe("build preview status route", () => {
  it("returns 401 when signed out", async () => {
    mockedGetSession.mockResolvedValue(null);
    const build = await ownedBuild("user-a");

    expect((await getStatus(build.id)).status).toBe(401);
  });

  it("returns 404 for an unknown buildId", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });

    expect((await getStatus(crypto.randomUUID())).status).toBe(404);
  });

  it("returns 404 for another founder's build", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    mockedGetSession.mockResolvedValue({ userId: "user-b" });
    expect((await getStatus(build.id)).status).toBe(404);
  });

  it("returns phase idle with empty logs when nothing has started", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    const build = await ownedBuild("user-a");

    const response = await getStatus(build.id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toEqual({
      phase: "idle",
      logs: [],
      url: null,
      expiresAt: null,
      error: null,
      revisionNumber: null,
      latestRevisionNumber: null,
      stale: false,
    });
  });

  it("returns phase ready with the preview url and logs after a successful start", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    const postBody = await (await post(build.id)).json();

    const response = await getStatus(build.id);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.status.phase).toBe("ready");
    expect(body.status.url).toBe(postBody.preview.url);
    expect(body.status.logs.length).toBeGreaterThan(0);
  });

  it("reports stale: false and the current revisionNumber when serving the latest revision", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    await post(build.id);

    const response = await getStatus(build.id);
    const body = await response.json();

    expect(body.status.revisionNumber).toBe(1);
    expect(body.status.latestRevisionNumber).toBe(1);
    expect(body.status.stale).toBe(false);
  });

  it("reports stale: true once a newer revision exists than the one being served", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");

    await post(build.id);
    await getArtifactRevisionsRepository().createForUser(
      {
        buildId: build.id,
        editRequest: "Make the hero CTA more direct",
        artifact: { formatVersion: 1, files: [{ path: "index.html", contents: "<html>v2</html>" }] },
      },
      "user-a",
    );

    const response = await getStatus(build.id);
    const body = await response.json();

    expect(body.status.revisionNumber).toBe(1);
    expect(body.status.latestRevisionNumber).toBe(2);
    expect(body.status.stale).toBe(true);
  });

  it("reports a forced serve failure as phase failed with logs and an error", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");
    sandboxControl.failExec = true;

    const postResponse = await post(build.id);
    expect(postResponse.status).toBe(502);

    const response = await getStatus(build.id);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.status.phase).toBe("failed");
    expect(body.status.error).toBeTruthy();
    expect(body.status.logs.some((entry: { message: string }) => entry.message.includes("serve boom"))).toBe(true);
  });

  it("allows retrying after a failure without stacking a duplicate active preview", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-a" });
    mockedGetStageOutputRecords.mockResolvedValue(approvedRecords);
    const build = await ownedBuild("user-a");
    sandboxControl.failExec = true;

    expect((await post(build.id)).status).toBe(502);

    sandboxControl.failExec = false;
    const retryResponse = await post(build.id);
    expect(retryResponse.status).toBe(201);
    const retryBody = await retryResponse.json();

    const statusResponse = await getStatus(build.id);
    const statusBody = await statusResponse.json();
    expect(statusBody.status.phase).toBe("ready");
    expect(statusBody.status.url).toBe(retryBody.preview.url);

    const secondPostResponse = await post(build.id);
    expect(secondPostResponse.status).toBe(200);
    const secondPostBody = await secondPostResponse.json();
    expect(secondPostBody.preview).toEqual(retryBody.preview);
  });
});
