import { describe, expect, it } from "vitest";
import { assembleLaunchPacket, LAUNCH_PACKET_SECTIONS, type StageOutputRecord } from "./packet";
import {
  buildLaunchKitArtifact,
  buildPacketJsonArtifact,
  buildPacketMarkdown,
  PACKET_EXPORT_FORMAT_VERSION,
} from "./packet-export";

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

describe("buildPacketMarkdown", () => {
  it("includes approved content and prefers editedOutput over rawOutput", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        rawOutput: { summary: "raw summary" },
        editedOutput: { summary: "Creator-economy tax tooling is underserved" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const markdown = buildPacketMarkdown(packet, meta);

    expect(markdown).toContain("Creator-economy tax tooling is underserved");
    expect(markdown).not.toContain("raw summary");
  });

  it("renders unapproved sections as pending", () => {
    const packet = assembleLaunchPacket(
      [
        record({
          stageName: "copy-deck",
          rawOutput: { headline: "Draft headline pending review" },
          approvedAt: null,
        }),
      ],
      { includeDrafts: true },
    );

    const markdown = buildPacketMarkdown(packet, meta);

    expect(markdown).not.toContain("Draft headline pending review");
    expect(markdown).toContain("## Copy Deck");
    expect(markdown).toContain("_Not yet approved — approve this stage in LaunchBlitz and re-download._");
  });

  it("renders all sections in canonical order and includes version + build metadata", () => {
    const stages = LAUNCH_PACKET_SECTIONS.map((section) => section.stageName);
    const records = stages.map((stageName) =>
      record({ stageName, editedOutput: { ok: true }, approvedAt: new Date("2026-07-10T10:00:00Z") }),
    );
    const packet = assembleLaunchPacket(records);

    const markdown = buildPacketMarkdown(packet, meta);

    const headingIndexes = LAUNCH_PACKET_SECTIONS.map((section) => markdown.indexOf(`## ${section.title}`));
    expect(headingIndexes.every((index) => index !== -1)).toBe(true);
    for (let i = 1; i < headingIndexes.length; i += 1) {
      expect(headingIndexes[i]).toBeGreaterThan(headingIndexes[i - 1]);
    }

    expect(markdown).toContain(`<!-- launchblitz-launch-packet v${PACKET_EXPORT_FORMAT_VERSION} -->`);
    expect(markdown).toContain(meta.buildId);
    expect(markdown).toContain(meta.generatedAt);
  });
});

describe("buildPacketJsonArtifact", () => {
  it("round-trips through JSON and reflects the packet + meta", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const artifact = buildPacketJsonArtifact(packet, meta);

    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
    expect(artifact.formatVersion).toBe(1);
    expect(artifact.sections).toHaveLength(5);
    expect(artifact.buildId).toBe(meta.buildId);
    expect(artifact.generatedAt).toBe(meta.generatedAt);

    const approved = artifact.sections.find((section) => section.key === "market-validation");
    expect(approved?.content).toEqual({ summary: "ok" });

    const missing = artifact.sections.find((section) => section.key === "customer-avatar");
    expect(missing?.content).toBeNull();
  });
});

describe("buildLaunchKitArtifact", () => {
  it("with an approved launch-kit record: readiness checklist + launch kit content", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
      record({
        stageName: "launch-kit",
        editedOutput: { checklist: "Ready to launch" },
        approvedAt: new Date("2026-07-11T00:00:00Z"),
      }),
    ]);

    const artifact = buildLaunchKitArtifact(packet, meta);

    expect(artifact.markdown).toContain("# Launch Kit");
    expect(artifact.markdown).toContain("- [x] Market Validation — approved");
    expect(artifact.markdown).toContain("- [x] Launch Kit — approved");
    expect(artifact.markdown).toContain("- [ ] Customer Avatar — pending");
    expect(artifact.markdown).toContain("Ready to launch");
    expect(artifact.pendingSections).toEqual(packet.missingSections);
  });

  it("with no approved launch-kit record: not-yet-approved contents, incomplete packet", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const artifact = buildLaunchKitArtifact(packet, meta);

    expect(artifact.markdown).toContain(
      "_The Launch Kit stage is not yet approved — approve it in LaunchBlitz and re-download this artifact._",
    );
    expect(artifact.isComplete).toBe(false);
  });
});
