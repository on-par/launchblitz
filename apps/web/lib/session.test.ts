import { describe, expect, it } from "vitest";
import { sanitizeRedirect, START_BUILD_PATH } from "./session";

describe("sanitizeRedirect", () => {
  it("keeps same-origin absolute paths", () => {
    expect(sanitizeRedirect("/builds")).toBe("/builds");
    expect(sanitizeRedirect("/builds/demo?step=2")).toBe("/builds/demo?step=2");
    expect(sanitizeRedirect("/settings/keys")).toBe("/settings/keys");
  });

  it("falls back to the start-build path for empty or missing targets", () => {
    expect(sanitizeRedirect(undefined)).toBe(START_BUILD_PATH);
    expect(sanitizeRedirect(null)).toBe(START_BUILD_PATH);
    expect(sanitizeRedirect("")).toBe(START_BUILD_PATH);
  });

  it("rejects open-redirect vectors", () => {
    const vectors = [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "http://evil.example/builds",
      "javascript:alert(1)",
      "mailto:founder@example.com",
    ];
    for (const vector of vectors) {
      expect(sanitizeRedirect(vector)).toBe(START_BUILD_PATH);
    }
  });
});
