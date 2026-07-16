import { describe, expect, it } from "vitest";
import { assembleLaunchPacket, LAUNCH_PACKET_SECTIONS, type StageOutputRecord } from "./packet";
import { buildLovableHandoff, LOVABLE_HANDOFF_FORMAT_VERSION } from "./lovable-handoff";

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

describe("buildLovableHandoff", () => {
  it("renders only approved sections, leaving unapproved drafts pending", () => {
    const packet = assembleLaunchPacket(
      [
        record({
          stageName: "market-validation",
          editedOutput: { summary: "Creator-economy tax tooling is underserved" },
          approvedAt: new Date("2026-07-10T10:00:00Z"),
        }),
        record({
          stageName: "copy-deck",
          rawOutput: { headline: "Draft headline pending review" },
          approvedAt: null,
        }),
      ],
      { includeDrafts: true },
    );

    const handoff = buildLovableHandoff(packet);

    expect(handoff.includedSections).toEqual(["Market Validation"]);
    expect(handoff.pendingSections).toContain("Copy Deck");
    expect(handoff.markdown).not.toContain("Draft headline pending review");
  });

  it("preserves canonical section order in the rendered markdown", () => {
    const stages = LAUNCH_PACKET_SECTIONS.map((section) => section.stageName);
    const records = stages.map((stageName) =>
      record({
        stageName,
        editedOutput: { ok: true },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    );

    const packet = assembleLaunchPacket(records);
    const handoff = buildLovableHandoff(packet);

    const headingIndexes = LAUNCH_PACKET_SECTIONS.map((section) =>
      handoff.markdown.indexOf(`## ${section.title}`),
    );

    expect(headingIndexes.every((index) => index !== -1)).toBe(true);
    for (let i = 1; i < headingIndexes.length; i += 1) {
      expect(headingIndexes[i]).toBeGreaterThan(headingIndexes[i - 1]);
    }
  });

  it("emits the version marker", () => {
    const packet = assembleLaunchPacket([]);
    const handoff = buildLovableHandoff(packet);

    expect(handoff.markdown).toContain("<!-- launchblitz-lovable-handoff v1 -->");
    expect(handoff.formatVersion).toBe(LOVABLE_HANDOFF_FORMAT_VERSION);
  });

  it("reports incomplete packets with a pending-sections block and completes without one", () => {
    const incompletePacket = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);
    const incompleteHandoff = buildLovableHandoff(incompletePacket);

    expect(incompleteHandoff.isComplete).toBe(false);
    expect(incompleteHandoff.markdown).toContain("## Pending sections");
    for (const title of incompletePacket.missingSections) {
      expect(incompleteHandoff.markdown).toContain(title);
    }

    const stages = LAUNCH_PACKET_SECTIONS.map((section) => section.stageName);
    const completePacket = assembleLaunchPacket(
      stages.map((stageName) =>
        record({
          stageName,
          editedOutput: { ok: true },
          approvedAt: new Date("2026-07-10T10:00:00Z"),
        }),
      ),
    );
    const completeHandoff = buildLovableHandoff(completePacket);

    expect(completeHandoff.isComplete).toBe(true);
    expect(completeHandoff.markdown).not.toContain("## Pending sections");
  });

  it("renders string content verbatim, object content as fenced json, and null content as a placeholder", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "Creator-economy tax tooling is underserved", stats: { tam: 42 } },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
      record({
        stageName: "customer-avatar",
        rawOutput: null,
        editedOutput: null,
        approvedAt: new Date("2026-07-10T10:05:00Z"),
      }),
    ]);

    const handoff = buildLovableHandoff(packet);

    expect(handoff.markdown).toContain("**summary**");
    expect(handoff.markdown).toContain("Creator-economy tax tooling is underserved");
    expect(handoff.markdown).toContain("**stats**");
    expect(handoff.markdown).toContain("```json");
    expect(handoff.markdown).toContain(JSON.stringify({ tam: 42 }, null, 2));
    expect(handoff.markdown).toContain("_No content captured for this section._");
  });

  it("reflects later approvals when regenerated and is deterministic for identical input", () => {
    const baseRecords = [
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ];

    const before = buildLovableHandoff(assembleLaunchPacket(baseRecords));
    expect(before.markdown).not.toContain("Copy Deck headline");
    expect(before.pendingSections).toContain("Copy Deck");

    const afterRecords = [
      ...baseRecords,
      record({
        stageName: "copy-deck",
        editedOutput: { headline: "Copy Deck headline" },
        approvedAt: new Date("2026-07-11T00:00:00Z"),
      }),
    ];

    const afterPacket = assembleLaunchPacket(afterRecords);
    const after = buildLovableHandoff(afterPacket);

    expect(after.markdown).toContain("Copy Deck headline");
    expect(after.pendingSections).not.toContain("Copy Deck");
    expect(after.pendingSections.length).toBeLessThan(before.pendingSections.length);

    const repeat = buildLovableHandoff(afterPacket);
    expect(repeat.markdown).toBe(after.markdown);
  });

  it("includes the approved section's approvedAt timestamp in its approved line", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const handoff = buildLovableHandoff(packet);
    const section = packet.sections.find((s) => s.key === "market-validation");

    expect(handoff.markdown).toContain(`_Approved ${section?.approvedAt}_`);
  });
});
