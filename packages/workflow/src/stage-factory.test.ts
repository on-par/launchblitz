import { describe, expect, it } from "vitest";
import { createPlaceholderStage } from "./stage-factory";

describe("createPlaceholderStage", () => {
  it("yields a progress event followed by a done result", async () => {
    const stage = createPlaceholderStage("demo");
    const events = [];
    for await (const event of stage({ buildId: "test", keys: {} })) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "progress", message: "Preparing demo." });

    const done = events[1];
    expect(done.type).toBe("done");
    if (done.type === "done") {
      expect(done.result.provider).toBe("unconfigured");
      expect(done.result.model).toBe("unconfigured");
      expect(done.result.output).toMatchObject({ stage: "demo", placeholder: true });
    }
  });
});
