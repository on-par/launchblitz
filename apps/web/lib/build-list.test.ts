import type { BuildRecord } from "@launchblitz/db";
import { describe, expect, it } from "vitest";
import { formatUpdatedAt, toBuildListItem } from "./build-list";

function record(overrides: Partial<BuildRecord> = {}): BuildRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "user-a",
    status: "active",
    currentStage: 0,
    seedIdea: "A tax planner for solo creators",
    createdAt: new Date("2026-07-15T12:00:00Z"),
    updatedAt: new Date("2026-07-16T15:04:00Z"),
    ...overrides,
  };
}

describe("toBuildListItem", () => {
  it("maps a full record", () => {
    const item = toBuildListItem(record());

    expect(item.title).toBe("A tax planner for solo creators");
    expect(item.status).toBe("active");
    expect(item.stageLabel).toBe("Idea");
    expect(item.resumeHref).toBe("/dashboard/builds/11111111-1111-1111-1111-111111111111");
  });

  it("falls back to the first stage for an out-of-range currentStage", () => {
    const item = toBuildListItem(record({ currentStage: 99 }));
    expect(item.stageLabel).toBe("Idea");
  });

  it("falls back to 'Untitled build' for a null or empty seedIdea", () => {
    expect(toBuildListItem(record({ seedIdea: null })).title).toBe("Untitled build");
    expect(toBuildListItem(record({ seedIdea: "   " })).title).toBe("Untitled build");
  });

  it("falls back to createdAt when updatedAt is null", () => {
    const item = toBuildListItem(
      record({ updatedAt: null, createdAt: new Date("2026-07-15T12:00:00Z") }),
    );
    expect(item.updatedLabel).toBe("Jul 15, 2026, 12:00 PM");
  });
});

describe("formatUpdatedAt", () => {
  it("formats a date in UTC, en-US style", () => {
    expect(formatUpdatedAt(new Date("2026-07-16T15:04:00Z"))).toBe("Jul 16, 2026, 3:04 PM");
  });

  it("returns an em dash for a missing timestamp", () => {
    expect(formatUpdatedAt(null)).toBe("—");
  });
});
