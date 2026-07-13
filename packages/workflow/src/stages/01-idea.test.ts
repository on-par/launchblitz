import { describe, expect, it, vi } from "vitest";
import { WorkflowStageError } from "../errors";
import { createIdeaStage, type IdeaGenerator, type IdeaSummary } from "./01-idea";

const fakeSummary: IdeaSummary = {
  name: "LaundryPal",
  oneLiner: "On-demand laundry pickup for busy professionals.",
  problem: "Doing laundry eats a weekend afternoon.",
  audience: "Urban professionals with disposable income.",
  valueProposition: "Get your weekend back.",
};

function makeFakeGenerate(): IdeaGenerator {
  return vi.fn(async () => ({
    output: fakeSummary,
    provider: "fake-provider",
    model: "fake-model",
  }));
}

describe("createIdeaStage", () => {
  it("yields progress then done with the generator's output on success", async () => {
    const generate = makeFakeGenerate();
    const stage = createIdeaStage(generate);
    const events = [];
    for await (const event of stage({ buildId: "build-1", keys: { anthropic: "key" }, idea: "a laundry app" })) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "progress", message: "Capturing your idea." });
    const done = events[1];
    expect(done.type).toBe("done");
    if (done.type === "done") {
      expect(done.result.output).toEqual(fakeSummary);
      expect(done.result.provider).toBe("fake-provider");
      expect(done.result.model).toBe("fake-model");
    }
    expect(generate).toHaveBeenCalledWith("a laundry app", "key");
  });

  it("throws missing_provider_key when no anthropic key is present, without calling the generator", async () => {
    const generate = makeFakeGenerate();
    const stage = createIdeaStage(generate);

    await expect(async () => {
      for await (const _ of stage({ buildId: "build-1", keys: {}, idea: "a laundry app" })) {
        // drain
      }
    }).rejects.toMatchObject({ code: "missing_provider_key" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("throws missing_idea when there is no idea text, without calling the generator", async () => {
    const generate = makeFakeGenerate();
    const stage = createIdeaStage(generate);

    await expect(async () => {
      for await (const _ of stage({ buildId: "build-1", keys: { anthropic: "key" }, idea: "  " })) {
        // drain
      }
    }).rejects.toBeInstanceOf(WorkflowStageError);
    await expect(async () => {
      for await (const _ of stage({ buildId: "build-1", keys: { anthropic: "key" } })) {
        // drain
      }
    }).rejects.toMatchObject({ code: "missing_idea" });
    expect(generate).not.toHaveBeenCalled();
  });
});
