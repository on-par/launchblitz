import { describe, expect, it } from "vitest";
import { InMemoryPreviewProgressStore } from "./preview-progress";

describe("InMemoryPreviewProgressStore", () => {
  it("returns null for an unknown build", () => {
    const store = new InMemoryPreviewProgressStore();
    expect(store.get("unknown-build")).toBeNull();
  });

  it("begin creates a creating-workspace record with empty logs and null error/workspaceId", () => {
    const store = new InMemoryPreviewProgressStore();
    store.begin("build-1");

    expect(store.get("build-1")).toEqual({
      buildId: "build-1",
      phase: "creating-workspace",
      workspaceId: null,
      logs: [],
      error: null,
    });
  });

  it("setPhase updates the phase and records the workspaceId when provided", () => {
    const store = new InMemoryPreviewProgressStore();
    store.begin("build-1");

    store.setPhase("build-1", "writing-files", "ws-1");

    expect(store.get("build-1")).toEqual({
      buildId: "build-1",
      phase: "writing-files",
      workspaceId: "ws-1",
      logs: [],
      error: null,
    });

    store.setPhase("build-1", "starting-server");

    expect(store.get("build-1")).toMatchObject({
      phase: "starting-server",
      workspaceId: "ws-1",
    });
  });

  it("markReady sets the terminal phase and log snapshot", () => {
    const store = new InMemoryPreviewProgressStore();
    store.begin("build-1");
    store.setPhase("build-1", "starting-server", "ws-1");

    store.markReady("build-1", [{ source: "exec", message: "server listening" }]);

    expect(store.get("build-1")).toEqual({
      buildId: "build-1",
      phase: "ready",
      workspaceId: "ws-1",
      logs: [{ source: "exec", message: "server listening" }],
      error: null,
    });
  });

  it("markFailed sets the terminal phase, log snapshot, and error", () => {
    const store = new InMemoryPreviewProgressStore();
    store.begin("build-1");
    store.setPhase("build-1", "starting-server", "ws-1");

    store.markFailed("build-1", "The preview server failed to start.", [
      { source: "exec", message: "node: command not found" },
    ]);

    expect(store.get("build-1")).toEqual({
      buildId: "build-1",
      phase: "failed",
      workspaceId: "ws-1",
      logs: [{ source: "exec", message: "node: command not found" }],
      error: "The preview server failed to start.",
    });
  });

  it("begin after markFailed resets the record", () => {
    const store = new InMemoryPreviewProgressStore();
    store.begin("build-1");
    store.setPhase("build-1", "starting-server", "ws-1");
    store.markFailed("build-1", "boom", [{ source: "exec", message: "boom" }]);

    store.begin("build-1");

    expect(store.get("build-1")).toEqual({
      buildId: "build-1",
      phase: "creating-workspace",
      workspaceId: null,
      logs: [],
      error: null,
    });
  });

  it("mutations to a returned logs array don't leak back into the store", () => {
    const store = new InMemoryPreviewProgressStore();
    store.begin("build-1");
    store.markReady("build-1", [{ source: "exec", message: "one" }]);

    const record = store.get("build-1");
    record?.logs.push({ source: "exec", message: "two" });

    expect(store.get("build-1")?.logs).toEqual([{ source: "exec", message: "one" }]);
  });
});
