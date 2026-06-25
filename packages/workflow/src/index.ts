import { runStage01Idea } from "./stages/01-idea";
import { runStage02Market } from "./stages/02-market";
import { runStage03Avatar } from "./stages/03-avatar";
import { runStage04Positioning } from "./stages/04-positioning";
import type { BuildContext } from "./types";

export async function runWorkflow(ctx: BuildContext) {
  return [runStage01Idea(ctx), runStage02Market(ctx), runStage03Avatar(ctx), runStage04Positioning(ctx)];
}

export async function resumeWorkflow(ctx: BuildContext) {
  return runWorkflow(ctx);
}

export * from "./types";
