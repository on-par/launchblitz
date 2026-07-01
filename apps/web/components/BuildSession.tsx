import { ProgressStepper } from "@launchblitz/ui";
import { AvatarBuilder } from "./stages/AvatarBuilder";
import { IdeaCapture } from "./stages/IdeaCapture";
import { MarketValidation } from "./stages/MarketValidation";
import { Positioning } from "./stages/Positioning";

const steps = ["Idea", "Market", "Avatar", "Positioning", "Copy", "Brand", "Export", "Launch"];

const stageTitles = [
  "Idea capture",
  "Market validation",
  "Customer avatar",
  "Positioning",
  "Copy deck",
  "Brand inputs",
  "Lovable export",
  "Launch kit",
];

export interface BuildSummary {
  id: string;
  status: string;
  currentStage: number;
  seedIdea: string;
}

export function BuildSession({ build }: { build?: BuildSummary }) {
  const currentStep = build?.currentStage ?? 0;
  const statusLabel = build ? formatStatus(build.status) : "Skeleton";
  const heading = build ? (stageTitles[currentStep] ?? "Build session") : "Workflow skeleton";

  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Build session</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          {heading}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Review each stage of the session as LaunchBlitz assembles the research, avatar,
          positioning, and downstream launch assets.
        </p>
      </header>
      <div className="rounded-[1.8rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ff9a71]">
            Session status
          </p>
          <span className="rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-3 py-1 text-xs font-semibold text-[#ffb999]">
            {statusLabel}
          </span>
        </div>
        {build ? (
          <div className="mt-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#CFD8DC]/45">
              Your idea
            </p>
            <p className="mt-2 text-sm leading-6 text-[#ECEFF1]/86">{build.seedIdea}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#ECEFF1]/76">
            The founder stays in approval control while the workflow keeps the output chain
            moving across the whole launch packet.
          </p>
        )}
      </div>
      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <ProgressStepper currentStep={currentStep} steps={steps} />
      </div>
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

function formatStatus(status: string): string {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
