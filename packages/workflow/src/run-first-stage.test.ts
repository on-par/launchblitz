import { describe, expect, it } from "vitest";
import { WorkflowStageError } from "./errors";
import { runFirstStage, type StageOneStore } from "./run-first-stage";
import type { IdeaSummary } from "./stages/01-idea";
import type { BuildContext, ProgressEvent, StageRunner } from "./types";

const fakeSummary: IdeaSummary = {
  name: "LaundryPal",
  oneLiner: "On-demand laundry pickup.",
  problem: "Doing laundry eats a weekend.",
  audience: "Urban professionals.",
  valueProposition: "Get your weekend back.",
};

function makeStore(builds: Record<string, { id: string; seedIdea: string | null; currentStage: number | null }>) {
  const upsertCalls: unknown[] = [];
  const updateCalls: unknown[] = [];
  const store: StageOneStore = {
    async getBuildForUser(buildId, _userId) {
      return builds[buildId];
    },
    async updateBuild(buildId, patch) {
      updateCalls.push({ buildId, patch });
    },
    async upsertStageOutput(row) {
      upsertCalls.push(row);
    },
  };
  return { store, upsertCalls, updateCalls };
}

function successStage(): StageRunner<IdeaSummary> {
  return async function* (_ctx: BuildContext): AsyncGenerator<ProgressEvent<IdeaSummary>> {
    yield { type: "progress", message: "Capturing your idea." };
    yield { type: "done", result: { output: fakeSummary, provider: "anthropic", model: "claude-opus-4-8" } };
  };
}

function failingStage(): StageRunner<IdeaSummary> {
  return async function* (_ctx: BuildContext): AsyncGenerator<ProgressEvent<IdeaSummary>> {
    yield { type: "progress", message: "Capturing your idea." };
    throw new WorkflowStageError("provider_error", "Anthropic request failed");
  };
}

describe("runFirstStage", () => {
  it("persists a complete row and advances the build on success", async () => {
    const { store, upsertCalls, updateCalls } = makeStore({
      "build-1": { id: "build-1", seedIdea: null, currentStage: 0 },
    });

    const result = await runFirstStage(
      store,
      { buildId: "build-1", userId: "user-1", idea: "a laundry app", keys: { anthropic: "key" } },
      successStage(),
    );

    expect(result).toEqual({ ok: true, output: fakeSummary, provider: "anthropic", model: "claude-opus-4-8" });
    expect(upsertCalls).toEqual([
      {
        buildId: "build-1",
        stageIndex: 1,
        stageName: "idea-capture",
        rawOutput: fakeSummary,
        provider: "anthropic",
        model: "claude-opus-4-8",
        status: "complete",
      },
    ]);
    expect(updateCalls).toEqual([
      { buildId: "build-1", patch: { status: "in_progress", currentStage: 1, seedIdea: "a laundry app" } },
    ]);
  });

  it("persists a failed row and marks the build stage_failed on stage error", async () => {
    const { store, upsertCalls, updateCalls } = makeStore({
      "build-1": { id: "build-1", seedIdea: null, currentStage: 0 },
    });

    const result = await runFirstStage(
      store,
      { buildId: "build-1", userId: "user-1", idea: "a laundry app", keys: { anthropic: "key" } },
      failingStage(),
    );

    expect(result).toEqual({ ok: false, code: "stage_failed", message: "Anthropic request failed" });
    expect(upsertCalls).toEqual([
      {
        buildId: "build-1",
        stageIndex: 1,
        stageName: "idea-capture",
        rawOutput: null,
        provider: "anthropic",
        model: "claude-opus-4-8",
        status: "failed",
        error: "Anthropic request failed",
      },
    ]);
    expect(updateCalls).toEqual([
      { buildId: "build-1", patch: { status: "stage_failed", seedIdea: "a laundry app" } },
    ]);
  });

  it("returns not_found and writes nothing for an unknown build", async () => {
    const { store, upsertCalls, updateCalls } = makeStore({});

    const result = await runFirstStage(
      store,
      { buildId: "missing", userId: "user-1", idea: "a laundry app", keys: { anthropic: "key" } },
      successStage(),
    );

    expect(result).toEqual({ ok: false, code: "not_found", message: "Build not found." });
    expect(upsertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("returns missing_idea and writes nothing when no idea is available anywhere", async () => {
    const { store, upsertCalls, updateCalls } = makeStore({
      "build-1": { id: "build-1", seedIdea: null, currentStage: 0 },
    });

    const result = await runFirstStage(
      store,
      { buildId: "build-1", userId: "user-1", keys: { anthropic: "key" } },
      successStage(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_idea");
    expect(upsertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("retries after a failure by upserting with the same buildId/stageIndex key", async () => {
    const { store, upsertCalls } = makeStore({
      "build-1": { id: "build-1", seedIdea: null, currentStage: 0 },
    });

    await runFirstStage(
      store,
      { buildId: "build-1", userId: "user-1", idea: "a laundry app", keys: { anthropic: "key" } },
      failingStage(),
    );
    await runFirstStage(
      store,
      { buildId: "build-1", userId: "user-1", idea: "a laundry app", keys: { anthropic: "key" } },
      successStage(),
    );

    expect(upsertCalls).toHaveLength(2);
    expect(upsertCalls[0]).toMatchObject({ buildId: "build-1", stageIndex: 1, status: "failed" });
    expect(upsertCalls[1]).toMatchObject({ buildId: "build-1", stageIndex: 1, status: "complete" });
  });
});
