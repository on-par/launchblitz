import { describe, expect, it } from "vitest";
import { InMemoryPreviewStore } from "./preview-store";

describe("InMemoryPreviewStore", () => {
  it("returns a stored record before it expires", () => {
    const store = new InMemoryPreviewStore();
    store.set({
      buildId: "build-1",
      workspaceId: "ws-1",
      url: "https://ws-1-3000.vercel.run",
      expiresAt: "2026-07-19T12:10:00.000Z",
      revisionNumber: 1,
    });

    const record = store.getActive("build-1", new Date("2026-07-19T12:00:00.000Z"));

    expect(record).toEqual({
      buildId: "build-1",
      workspaceId: "ws-1",
      url: "https://ws-1-3000.vercel.run",
      expiresAt: "2026-07-19T12:10:00.000Z",
      revisionNumber: 1,
    });
  });

  it("returns null at or after expiresAt", () => {
    const store = new InMemoryPreviewStore();
    store.set({
      buildId: "build-1",
      workspaceId: "ws-1",
      url: "https://ws-1-3000.vercel.run",
      expiresAt: "2026-07-19T12:10:00.000Z",
      revisionNumber: 1,
    });

    expect(store.getActive("build-1", new Date("2026-07-19T12:10:00.000Z"))).toBeNull();
    expect(store.getActive("build-1", new Date("2026-07-19T12:20:00.000Z"))).toBeNull();
  });

  it("returns null for an unknown build", () => {
    const store = new InMemoryPreviewStore();
    expect(store.getActive("unknown-build", new Date())).toBeNull();
  });

  it("returns null after delete", () => {
    const store = new InMemoryPreviewStore();
    store.set({
      buildId: "build-1",
      workspaceId: "ws-1",
      url: "https://ws-1-3000.vercel.run",
      expiresAt: "2026-07-19T12:10:00.000Z",
      revisionNumber: 1,
    });

    store.delete("build-1");

    expect(store.getActive("build-1", new Date("2026-07-19T12:00:00.000Z"))).toBeNull();
  });
});
