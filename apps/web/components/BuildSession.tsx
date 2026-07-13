import { ProgressStepper } from "@launchblitz/ui";
import type { IdeaSummary } from "@launchblitz/workflow";
import { StageOneRunner } from "./StageOneRunner";
import type { StageOneResultProps } from "./StageOneResult";

const steps = ["Idea", "Market", "Avatar", "Positioning", "Copy", "Brand", "Export", "Launch"];

export interface SavedStageOutput {
  output: unknown;
  provider: string | null;
  model: string | null;
  status: string;
  error: string | null;
}

export interface BuildSessionProps {
  build: { id: string; seedIdea: string | null; currentStage: number | null };
  stageOutput: SavedStageOutput | null;
}

function toStageOneResult(stageOutput: SavedStageOutput | null): StageOneResultProps | null {
  if (!stageOutput) return null;
  if (stageOutput.status === "failed") {
    return { status: "failed", error: stageOutput.error ?? "Stage failed." };
  }
  return {
    status: "complete",
    // rawOutput is jsonb; it was written by the schema-validated stage result.
    output: stageOutput.output as IdeaSummary,
    provider: stageOutput.provider ?? "anthropic",
    model: stageOutput.model ?? "",
  };
}

export function BuildSession({ build, stageOutput }: BuildSessionProps) {
  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Build session</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          Workflow skeleton
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Review each stage of the session as LaunchBlitz assembles the research, avatar,
          positioning, and downstream launch assets.
        </p>
      </header>
      <div className="rounded-[1.8rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 p-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ff9a71]">
          Session status
        </p>
        <p className="mt-3 text-sm leading-6 text-[#ECEFF1]/76">
          The founder stays in approval control while the workflow keeps the output chain
          moving across the whole launch packet.
        </p>
      </div>
      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <ProgressStepper currentStep={build.currentStage ?? 0} steps={steps} />
      </div>
      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-1">
        <StageOneRunner
          buildId={build.id}
          seedIdea={build.seedIdea}
          saved={toStageOneResult(stageOutput)}
        />
      </div>
    </section>
  );
}
