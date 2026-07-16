import { describe, expect, it } from "vitest";
import { approvedStageContent, assembleLaunchPacket, type StageOutputRecord } from "./packet";

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

describe("approvedStageContent", () => {
  it("returns the edited content for an approved record with editedOutput", () => {
    const content = approvedStageContent(
      record({
        rawOutput: { summary: "raw" },
        editedOutput: { summary: "edited" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    );
    expect(content).toEqual({ summary: "edited" });
  });

  it("falls back to rawOutput for an approved record with no editedOutput", () => {
    const content = approvedStageContent(
      record({
        rawOutput: { summary: "raw" },
        editedOutput: null,
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    );
    expect(content).toEqual({ summary: "raw" });
  });

  it("returns null for an unapproved record, even when editedOutput is present", () => {
    const content = approvedStageContent(
      record({
        rawOutput: { summary: "raw" },
        editedOutput: { summary: "edited" },
        approvedAt: null,
      }),
    );
    expect(content).toBeNull();
  });
});

describe("assembleLaunchPacket", () => {
  it("excludes unapproved drafts by default and marks the section missing", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "copy-deck",
        rawOutput: { headline: "Draft headline pending review" },
        approvedAt: null,
      }),
    ]);

    const copyDeck = packet.sections.find((section) => section.key === "copy-deck");
    expect(copyDeck?.status).toBe("missing");
    expect(copyDeck?.content).toBeNull();
    expect(packet.missingSections).toContain("Copy Deck");
  });

  it("prefers editedOutput over rawOutput for approved records", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        rawOutput: { summary: "Raw market scan" },
        editedOutput: { summary: "Creator-economy tax tooling is underserved" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    const section = packet.sections.find((s) => s.key === "market-validation");
    expect(section?.status).toBe("approved");
    expect(section?.content).toEqual({ summary: "Creator-economy tax tooling is underserved" });
  });

  it("falls back to rawOutput when editedOutput is null", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "customer-avatar",
        rawOutput: { persona: "Solo creator earning $60k+" },
        editedOutput: null,
        approvedAt: new Date("2026-07-10T10:05:00Z"),
      }),
    ]);

    const section = packet.sections.find((s) => s.key === "customer-avatar");
    expect(section?.status).toBe("approved");
    expect(section?.content).toEqual({ persona: "Solo creator earning $60k+" });
  });

  it("lists titles for all missing required sections while keeping all five sections in canonical order", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "ok" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
      record({
        stageName: "customer-avatar",
        editedOutput: { persona: "ok" },
        approvedAt: new Date("2026-07-10T10:05:00Z"),
      }),
    ]);

    expect(packet.sections.map((s) => s.key)).toEqual([
      "market-validation",
      "customer-avatar",
      "copy-deck",
      "landing-page-export",
      "launch-kit",
    ]);
    expect(packet.missingSections).toEqual(["Copy Deck", "Landing Page Export", "Launch Kit"]);
    expect(packet.isComplete).toBe(false);
  });

  it("is complete when all five required sections have approved output", () => {
    const stages = [
      "market-validation",
      "customer-avatar",
      "copy-deck",
      "lovable-export",
      "launch-kit",
    ];
    const records = stages.map((stageName) =>
      record({
        stageName,
        editedOutput: { ok: true },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    );

    const packet = assembleLaunchPacket(records);
    expect(packet.missingSections).toEqual([]);
    expect(packet.isComplete).toBe(true);
  });

  it("picks the latest approval when multiple approved records exist for a section", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "older" },
        approvedAt: new Date("2026-07-01T00:00:00Z"),
      }),
      record({
        stageName: "market-validation",
        editedOutput: { summary: "newer" },
        approvedAt: new Date("2026-07-10T00:00:00Z"),
      }),
    ]);

    const section = packet.sections.find((s) => s.key === "market-validation");
    expect(section?.content).toEqual({ summary: "newer" });
  });

  it("surfaces an unapproved record as a labeled draft when includeDrafts is true, but still lists it as missing", () => {
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

    const section = packet.sections.find((s) => s.key === "copy-deck");
    expect(section?.status).toBe("draft");
    expect(section?.content).toEqual({ headline: "Draft headline pending review" });
    expect(packet.missingSections).toContain("Copy Deck");
  });

  it("ignores records from non-packet stages", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "idea-capture",
        editedOutput: { idea: "some idea" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
    ]);

    expect(packet.sections).toHaveLength(5);
    expect(packet.sections.every((s) => s.stageName !== "idea-capture")).toBe(true);
  });

  it("normalizes both Date and ISO-string approvedAt inputs to an ISO string", () => {
    const packet = assembleLaunchPacket([
      record({
        stageName: "market-validation",
        editedOutput: { summary: "from date" },
        approvedAt: new Date("2026-07-10T10:00:00Z"),
      }),
      record({
        stageName: "customer-avatar",
        editedOutput: { persona: "from string" },
        approvedAt: "2026-07-10T10:05:00.000Z",
      }),
    ]);

    const market = packet.sections.find((s) => s.key === "market-validation");
    const avatar = packet.sections.find((s) => s.key === "customer-avatar");
    expect(market?.approvedAt).toBe("2026-07-10T10:00:00.000Z");
    expect(avatar?.approvedAt).toBe("2026-07-10T10:05:00.000Z");
  });
});
