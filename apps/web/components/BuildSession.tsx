import Link from "next/link";
import { ProgressStepper } from "@launchblitz/ui";
import type { ProviderReadiness } from "../lib/provider-readiness";
import { STAGE_NAMES, stageLabel } from "../lib/stages";
import { ProviderReadinessPanel } from "./ProviderReadinessPanel";
import { AvatarBuilder } from "./stages/AvatarBuilder";
import { IdeaCapture } from "./stages/IdeaCapture";
import { MarketValidation } from "./stages/MarketValidation";
import { Positioning } from "./stages/Positioning";
import { StageOutputEditor } from "./stages/StageOutputEditor";

export interface StageOutputView {
  id: string;
  buildId: string;
  stageIndex: number;
  stageName: string;
  rawText: string;
  editedText: string | null;
  approvedAt: string | null;
}

export interface BuildSessionProps {
  packetHref?: string;
  stageOutputs?: StageOutputView[];
  build?: { status: string; currentStage: number; seedIdea: string | null };
  providerReadiness?: ProviderReadiness;
  keyVaultHref?: string;
}

export function BuildSession({
  packetHref,
  stageOutputs = [],
  build,
  providerReadiness,
  keyVaultHref,
}: BuildSessionProps) {
  return (
    <section className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Build session</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
            Workflow skeleton
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
            Review each stage of the session as LaunchBlitz assembles the research, avatar,
            positioning, and downstream launch assets.
          </p>
        </div>
        {packetHref ? (
          <Link
            href={packetHref}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
          >
            Preview launch packet
          </Link>
        ) : null}
      </header>
      <div className="rounded-[1.8rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 p-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ff9a71]">
          Session status
        </p>
        {build ? (
          <div className="mt-3 space-y-1 text-sm leading-6 text-[#ECEFF1]/76">
            <p>Status: {build.status}</p>
            <p>Stage: {stageLabel(build.currentStage)}</p>
            {build.seedIdea ? <p>&ldquo;{build.seedIdea}&rdquo;</p> : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#ECEFF1]/76">
            The founder stays in approval control while the workflow keeps the output chain
            moving across the whole launch packet.
          </p>
        )}
      </div>
      {providerReadiness ? (
        <ProviderReadinessPanel
          readiness={providerReadiness}
          keyVaultHref={keyVaultHref ?? "/settings/keys"}
        />
      ) : null}
      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <ProgressStepper currentStep={build ? build.currentStage : 2} steps={[...STAGE_NAMES]} />
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
