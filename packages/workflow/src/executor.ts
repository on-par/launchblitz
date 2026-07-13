import type { BuildContext, StageResult, StageRunner } from "./types";

export async function runToCompletion<T>(
  runner: StageRunner<T>,
  ctx: BuildContext,
): Promise<StageResult<T>> {
  for await (const event of runner(ctx)) {
    if (event.type === "done") {
      return event.result;
    }
  }
  throw new Error("Stage ended without a result");
}
