/** Ordered display names for the workflow stages, indexed by `currentStage`. */
export const STAGE_NAMES = [
  "Idea", "Market", "Avatar", "Positioning", "Copy", "Brand", "Export", "Launch",
] as const;

/** Label for a stage index; out-of-range indexes fall back to the first stage. */
export function stageLabel(index: number): string {
  return STAGE_NAMES[index] ?? STAGE_NAMES[0];
}
