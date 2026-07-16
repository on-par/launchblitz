import { describe, expect, it } from "vitest";
import { resolveResumeState } from "./resume";

function output(stageIndex: number, approved: boolean) {
  return { stageIndex, approvedAt: approved ? new Date() : null };
}

describe("resolveResumeState", () => {
  it("resumes at stage 0 when no outputs exist", () => {
    expect(resolveResumeState([], 0, 8)).toEqual({ stageIndex: 0, complete: false });
  });

  it("resumes at the first not-yet-generated stage after an approval", () => {
    const outputs = [output(0, true)];
    expect(resolveResumeState(outputs, 1, 8)).toEqual({ stageIndex: 1, complete: false });
  });

  it("resumes at a generated-but-unapproved stage (failed/ungenerated content)", () => {
    const outputs = [output(0, false)];
    expect(resolveResumeState(outputs, 0, 8)).toEqual({ stageIndex: 0, complete: false });
  });

  it("leave-and-return regression: an edit clearing approval sends resume back to that stage", () => {
    const outputs = [output(0, true), output(1, false)];
    expect(resolveResumeState(outputs, 2, 8)).toEqual({ stageIndex: 1, complete: false });
    // pure function: input untouched
    expect(outputs[0].approvedAt).not.toBeNull();
    expect(outputs[1].approvedAt).toBeNull();
  });

  it("resumes at the first unapproved stage among non-contiguous approvals", () => {
    const outputs = [output(0, true), output(1, false), output(2, true)];
    expect(resolveResumeState(outputs, 2, 8)).toEqual({ stageIndex: 1, complete: false });
  });

  it("marks the build complete once every stage is approved", () => {
    const stageCount = 8;
    const outputs = Array.from({ length: stageCount }, (_, i) => output(i, true));
    expect(resolveResumeState(outputs, stageCount - 1, stageCount)).toEqual({
      stageIndex: stageCount - 1,
      complete: true,
    });
  });

  it("never resumes past the currentStage lock frontier", () => {
    const outputs = [output(0, true), output(1, true), output(2, true)];
    expect(resolveResumeState(outputs, 1, 8)).toEqual({ stageIndex: 1, complete: false });
  });

  it("clamps an out-of-range currentStage into [0, stageCount - 1]", () => {
    const outputs = [output(0, true)];
    expect(resolveResumeState(outputs, -1, 8)).toEqual({ stageIndex: 0, complete: false });
    expect(resolveResumeState(outputs, 99, 8)).toEqual({ stageIndex: 1, complete: false });
  });
});
