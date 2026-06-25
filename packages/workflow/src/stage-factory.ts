import type { StageRunner } from "./types";

export function createPlaceholderStage<T>(name: string): StageRunner<T> {
  return async function* placeholderStage() {
    yield { type: "progress", message: `Preparing ${name}.` };
    yield {
      type: "done",
      result: {
        output: { stage: name, placeholder: true } as T,
        provider: "unconfigured",
        model: "unconfigured",
      },
    };
  };
}
