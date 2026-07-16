import type { StageOutputRecord } from "./stage-outputs";

/** Where a reopened Build should resume, derived from approval state. */
export interface ResumeState {
  /** First incomplete or failed stage; last stage when `complete`. */
  stageIndex: number;
  /** True when every stage 0..stageCount-1 has an approved output. */
  complete: boolean;
}

/**
 * A stage is complete iff a stage-output record exists for its index with
 * `approvedAt !== null`. Everything else is actionable: no output row at all
 * (not yet generated), or an output row with `approvedAt === null` (a
 * generation that produced bad/empty output, or an edit that cleared a prior
 * approval — see `saveEditForUser`). The repo has no persisted failure
 * status, so both cases collapse into "incomplete."
 *
 * Resume stage is the smallest incomplete stage index, clamped so it never
 * points past the build's `currentStage` lock frontier (the approve route
 * returns 409 for `stageIndex > currentStage`, so a later stage is never
 * actionable). If every stage is complete, resume at the last stage with
 * `complete: true`.
 */
export function resolveResumeState(
  outputs: ReadonlyArray<Pick<StageOutputRecord, "stageIndex" | "approvedAt">>,
  currentStage: number,
  stageCount: number,
): ResumeState {
  const approved = new Set(
    outputs.filter((o) => o.approvedAt !== null).map((o) => o.stageIndex),
  );
  let firstIncomplete = stageCount;
  for (let i = 0; i < stageCount; i += 1) {
    if (!approved.has(i)) {
      firstIncomplete = i;
      break;
    }
  }
  if (firstIncomplete >= stageCount) {
    return { stageIndex: stageCount - 1, complete: true };
  }
  const frontier = Math.min(Math.max(currentStage, 0), stageCount - 1);
  return { stageIndex: Math.min(firstIncomplete, frontier), complete: false };
}
