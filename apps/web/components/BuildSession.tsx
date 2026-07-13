import { ProgressStepper } from "@launchblitz/ui";
import { AvatarBuilder } from "./stages/AvatarBuilder";
import { IdeaCapture } from "./stages/IdeaCapture";
import { MarketValidation } from "./stages/MarketValidation";
import { Positioning } from "./stages/Positioning";
import { StageOutputEditor } from "./stages/StageOutputEditor";

const steps = ["Idea", "Market", "Avatar", "Positioning", "Copy", "Brand", "Export", "Launch"];

export interface StageOutputView {
  id: string;
  buildId: string;
  stageIndex: number;
  stageName: string;
  rawText: string;
  editedText: string | null;
}

export interface BuildSessionProps {
  stageOutputs?: StageOutputView[];
}

export function BuildSession({ stageOutputs = [] }: BuildSessionProps) {
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
        <ProgressStepper currentStep={2} steps={steps} />
      </div>
      {stageOutputs.length > 0 && (
        <div className="space-y-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/46">
            Generated outputs
          </p>
          <div className="space-y-4">
            {[...stageOutputs]
              .sort((a, b) => a.stageIndex - b.stageIndex)
              .map((stageOutput) => (
                <StageOutputEditor key={stageOutput.id} {...stageOutput} />
              ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-1">
          <IdeaCapture />
        </div>
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-1">
          <MarketValidation />
        </div>
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-1">
          <AvatarBuilder />
        </div>
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-1">
          <Positioning />
        </div>
      </div>
    </section>
  );
}
