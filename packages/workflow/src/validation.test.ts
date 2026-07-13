import { describe, expect, it } from "vitest";
import { parseRunStageBody } from "./validation";

describe("parseRunStageBody", () => {
  it("accepts a valid idea", () => {
    expect(parseRunStageBody({ idea: "a laundry app" })).toEqual({ ok: true, idea: "a laundry app" });
  });

  it("accepts a missing idea field", () => {
    expect(parseRunStageBody({})).toEqual({ ok: true, idea: undefined });
  });

  it("trims surrounding whitespace", () => {
    expect(parseRunStageBody({ idea: "  a laundry app  " })).toEqual({ ok: true, idea: "a laundry app" });
  });

  it("treats a whitespace-only idea as absent", () => {
    expect(parseRunStageBody({ idea: "   " })).toEqual({ ok: true, idea: undefined });
  });

  it("rejects a non-string idea", () => {
    const result = parseRunStageBody({ idea: 42 });
    expect(result.ok).toBe(false);
  });

  it("rejects an idea over the max length", () => {
    const result = parseRunStageBody({ idea: "a".repeat(2001) });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(parseRunStageBody(null).ok).toBe(false);
    expect(parseRunStageBody("nope").ok).toBe(false);
  });
});
