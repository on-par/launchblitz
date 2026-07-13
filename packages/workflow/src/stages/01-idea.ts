import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { WorkflowStageError } from "../errors";
import type { BuildContext, StageResult, StageRunner } from "../types";

export const IDEA_STAGE_NAME = "idea-capture";
export const IDEA_STAGE_INDEX = 1;
export const IDEA_MODEL = "claude-opus-4-8";

export const ideaSummarySchema = z.object({
  name: z.string(),
  oneLiner: z.string(),
  problem: z.string(),
  audience: z.string(),
  valueProposition: z.string(),
});

export type IdeaSummary = z.infer<typeof ideaSummarySchema>;

export type IdeaGenerator = (idea: string, apiKey: string) => Promise<StageResult<IdeaSummary>>;

function buildPrompt(idea: string): string {
  return `A founder described this business idea: ${idea}. Normalize it into the idea summary fields (product name suggestion, one-liner, problem, target audience, value proposition). Be concrete and concise.`;
}

const generateWithAnthropic: IdeaGenerator = async (idea, apiKey) => {
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse({
      model: IDEA_MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(ideaSummarySchema) },
      messages: [{ role: "user", content: buildPrompt(idea) }],
    });
    if (!response.parsed_output) {
      throw new WorkflowStageError("invalid_output", "Model returned no parseable idea summary.");
    }
    return {
      output: response.parsed_output,
      provider: "anthropic",
      model: response.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (err) {
    if (err instanceof WorkflowStageError) throw err;
    throw new WorkflowStageError(
      "provider_error",
      err instanceof Error ? err.message : "Anthropic request failed",
    );
  }
};

export function createIdeaStage(generate: IdeaGenerator = generateWithAnthropic): StageRunner<IdeaSummary> {
  return async function* runIdeaStage(ctx: BuildContext) {
    yield { type: "progress", message: "Capturing your idea." };

    if (!ctx.keys.anthropic) {
      throw new WorkflowStageError("missing_provider_key", "Add an Anthropic API key to run this stage.");
    }
    if (!ctx.idea?.trim()) {
      throw new WorkflowStageError("missing_idea", "No idea text to capture.");
    }

    yield { type: "done", result: await generate(ctx.idea, ctx.keys.anthropic) };
  };
}

export const runStage01Idea = createIdeaStage();
