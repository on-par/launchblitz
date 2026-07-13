import { runToCompletion } from "./executor";
import { WorkflowStageError } from "./errors";
import { IDEA_MODEL, IDEA_STAGE_INDEX, IDEA_STAGE_NAME, runStage01Idea, type IdeaSummary } from "./stages/01-idea";
import type { ProviderKeys, StageRunner } from "./types";

export interface StageOneStore {
  getBuildForUser(
    buildId: string,
    userId: string,
  ): Promise<{ id: string; seedIdea: string | null; currentStage: number | null } | undefined>;
  updateBuild(
    buildId: string,
    patch: { status?: string; currentStage?: number; seedIdea?: string },
  ): Promise<void>;
  upsertStageOutput(row: {
    buildId: string;
    stageIndex: number;
    stageName: string;
    rawOutput: unknown;
    provider: string;
    model: string;
    status: string;
    error?: string;
  }): Promise<void>;
}

export type RunFirstStageResult =
  | { ok: true; output: IdeaSummary; provider: string; model: string }
  | { ok: false; code: "not_found" | "missing_idea" | "stage_failed"; message: string };

export async function runFirstStage(
  store: StageOneStore,
  input: { buildId: string; userId: string; idea?: string; keys: ProviderKeys },
  stage: StageRunner<IdeaSummary> = runStage01Idea,
): Promise<RunFirstStageResult> {
  const build = await store.getBuildForUser(input.buildId, input.userId);
  if (!build) {
    return { ok: false, code: "not_found", message: "Build not found." };
  }

  const idea = input.idea?.trim() || build.seedIdea?.trim();
  if (!idea) {
    return { ok: false, code: "missing_idea", message: "No idea text to capture." };
  }

  let result;
  try {
    result = await runToCompletion(stage, { buildId: input.buildId, keys: input.keys, idea });
  } catch (err) {
    const message =
      err instanceof WorkflowStageError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Stage failed.";
    // Best-effort: if persisting the failure itself fails (e.g. the DB is the
    // reason the stage failed), still report stage_failed to the caller rather
    // than throwing an unhandled rejection from the error path.
    try {
      await Promise.all([
        store.upsertStageOutput({
          buildId: input.buildId,
          stageIndex: IDEA_STAGE_INDEX,
          stageName: IDEA_STAGE_NAME,
          rawOutput: null,
          provider: "anthropic",
          model: IDEA_MODEL,
          status: "failed",
          error: message,
        }),
        store.updateBuild(input.buildId, { status: "stage_failed", seedIdea: idea }),
      ]);
    } catch {
      // swallow: the stage_failed result below is still the accurate report to the caller
    }
    return { ok: false, code: "stage_failed", message };
  }

  // A successful stage result is only "lost" if these writes themselves fail —
  // that's a genuine infra error, not a stage failure, so it propagates rather
  // than being persisted as a misleading "failed" row that overwrites the
  // real output.
  await Promise.all([
    store.upsertStageOutput({
      buildId: input.buildId,
      stageIndex: IDEA_STAGE_INDEX,
      stageName: IDEA_STAGE_NAME,
      rawOutput: result.output,
      provider: result.provider,
      model: result.model,
      status: "complete",
    }),
    store.updateBuild(input.buildId, {
      status: "in_progress",
      currentStage: IDEA_STAGE_INDEX,
      seedIdea: idea,
    }),
  ]);
  return { ok: true, output: result.output, provider: result.provider, model: result.model };
}
