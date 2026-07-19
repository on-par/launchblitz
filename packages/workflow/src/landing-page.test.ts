import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { assembleLaunchPacket, type StageOutputRecord } from "./packet";
import {
  buildLandingPageArtifact,
  buildLandingPageZip,
  computePacketRevision,
  getMissingLandingPageSections,
} from "./landing-page";

function record(overrides: Partial<StageOutputRecord>): StageOutputRecord {
  return {
    stageIndex: 0,
    stageName: "market-validation",
    rawOutput: null,
    editedOutput: null,
    approvedAt: null,
    ...overrides,
  };
}

const meta = { buildId: "00000000-0000-4000-8000-000000000000", generatedAt: "2026-07-16T00:00:00.000Z" };

function approvedPacket() {
  return assembleLaunchPacket(
    [
      record({
        stageName: "copy-deck",
        editedOutput: { headline: "Creator tax tooling, finally simple", subhead: "Built for solo creators" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
      record({
        stageName: "market-validation",
        editedOutput: { summary: "Creator-economy tax tooling is underserved" },
        approvedAt: new Date("2026-07-10T10:05:00Z"),
      }),
      record({
        stageName: "customer-avatar",
        rawOutput: { persona: "Solo creator earning $60k+" },
        approvedAt: null,
      }),
    ],
    { includeDrafts: true },
  );
}

describe("getMissingLandingPageSections", () => {
  it("returns [] when copy-deck is approved", () => {
    expect(getMissingLandingPageSections(approvedPacket())).toEqual([]);
  });

  it("returns ['Copy Deck'] when copy-deck is not approved", () => {
    const packet = assembleLaunchPacket([
      record({ stageName: "copy-deck", rawOutput: { headline: "Draft" }, approvedAt: null }),
    ]);

    expect(getMissingLandingPageSections(packet)).toEqual(["Copy Deck"]);
  });
});

describe("buildLandingPageArtifact", () => {
  it("throws naming the section when copy-deck is unapproved", () => {
    const packet = assembleLaunchPacket([
      record({ stageName: "copy-deck", rawOutput: { headline: "Draft" }, approvedAt: null }),
    ]);

    expect(() => buildLandingPageArtifact(packet, meta)).toThrow(/Copy Deck/);
  });

  it("produces an index.html with the marker, approved content, and no unapproved content or external requests", () => {
    const packet = approvedPacket();
    const artifact = buildLandingPageArtifact(packet, meta);
    const html = artifact.files.find((file) => file.path === "index.html")?.contents ?? "";

    expect(html).toContain(`launchblitz-landing-page v1 · packet revision ${artifact.packetRevision.fingerprint}`);
    expect(html).toContain("Creator tax tooling, finally simple");
    expect(html).toContain("Creator-economy tax tooling is underserved");
    expect(html).not.toContain("Solo creator earning $60k+");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("escapes HTML in section content", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "copy-deck",
        editedOutput: { headline: "<script>alert(1)</script>" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const artifact = buildLandingPageArtifact(packet, meta);
    const html = artifact.files.find((file) => file.path === "index.html")?.contents ?? "";

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("produces a metadata.json recording format version, build id, generated at, and packet revision", () => {
    const packet = approvedPacket();
    const artifact = buildLandingPageArtifact(packet, meta);
    const metadataFile = artifact.files.find((file) => file.path === "metadata.json");
    const metadata = JSON.parse(metadataFile?.contents ?? "{}");

    expect(metadata.formatVersion).toBe(1);
    expect(metadata.buildId).toBe(meta.buildId);
    expect(metadata.generatedAt).toBe(meta.generatedAt);
    expect(metadata.packetRevision.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "copy-deck", approvedAt: expect.any(String) }),
        expect.objectContaining({ key: "market-validation", approvedAt: expect.any(String) }),
      ]),
    );
  });
});

describe("buildLandingPageZip", () => {
  it("is byte-identical across calls and contains exactly index.html + metadata.json matching the artifact", () => {
    const packet = approvedPacket();
    const artifact = buildLandingPageArtifact(packet, meta);

    const zip1 = buildLandingPageZip(artifact);
    const zip2 = buildLandingPageZip(buildLandingPageArtifact(packet, meta));

    expect(Buffer.from(zip1).equals(Buffer.from(zip2))).toBe(true);

    const unzipped = unzipSync(zip1);
    expect(Object.keys(unzipped).sort()).toEqual(["index.html", "metadata.json"]);

    for (const file of artifact.files) {
      expect(Buffer.from(unzipped[file.path]).toString("utf-8")).toBe(file.contents);
    }
  });
});

describe("computePacketRevision", () => {
  it("changes fingerprint when approvedAt changes and stays stable otherwise", () => {
    const base = assembleLaunchPacket([
      record({
        stageName: "copy-deck",
        editedOutput: { headline: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);
    const changedApprovedAt = assembleLaunchPacket([
      record({
        stageName: "copy-deck",
        editedOutput: { headline: "ok" },
        approvedAt: new Date("2026-07-11T10:00:00Z"),
      }),
    ]);
    const changedContent = assembleLaunchPacket([
      record({
        stageName: "copy-deck",
        editedOutput: { headline: "different" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const baseRevision = computePacketRevision(base);
    expect(computePacketRevision(changedApprovedAt).fingerprint).not.toBe(baseRevision.fingerprint);
    expect(computePacketRevision(changedContent).fingerprint).not.toBe(baseRevision.fingerprint);
    expect(computePacketRevision(base).fingerprint).toBe(baseRevision.fingerprint);
  });
});
