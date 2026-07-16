import { describe, expect, it } from "vitest";
import { toProviderReadiness } from "./provider-readiness";

describe("toProviderReadiness", () => {
  it("is not ready when no provider keys are saved", () => {
    const readiness = toProviderReadiness([]);

    expect(readiness.ready).toBe(false);
    expect(readiness.missingLabels).toEqual(["Anthropic"]);
    expect(readiness.providers).toEqual([
      { provider: "anthropic", label: "Anthropic", ready: false, keyHint: null },
    ]);
  });

  it("is ready when the anthropic key is saved, passing through its keyHint", () => {
    const readiness = toProviderReadiness([{ provider: "anthropic", keyHint: "…abcd" }]);

    expect(readiness.ready).toBe(true);
    expect(readiness.missingLabels).toEqual([]);
    expect(readiness.providers).toEqual([
      { provider: "anthropic", label: "Anthropic", ready: true, keyHint: "…abcd" },
    ]);
  });

  it("ignores rows for providers outside the MVP list", () => {
    const readiness = toProviderReadiness([{ provider: "openai", keyHint: "…zzzz" }]);

    expect(readiness.ready).toBe(false);
    expect(readiness.missingLabels).toEqual(["Anthropic"]);
  });
});
