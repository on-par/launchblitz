import { ProgressStepper } from "@launchblitz/ui";
import { AvatarBuilder } from "./stages/AvatarBuilder";
import { IdeaCapture } from "./stages/IdeaCapture";
import { MarketValidation } from "./stages/MarketValidation";
import { Positioning } from "./stages/Positioning";

const steps = ["Idea", "Market", "Avatar", "Positioning", "Copy", "Brand", "Export", "Launch"];

export function BuildSession() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-black/45">Build session</p>
        <h1 className="mt-2 text-4xl font-semibold">Workflow skeleton</h1>
      </header>
      <ProgressStepper currentStep={2} steps={steps} />
      <div className="grid gap-4 xl:grid-cols-2">
        <IdeaCapture />
        <MarketValidation />
        <AvatarBuilder />
        <Positioning />
      </div>
    </section>
  );
}
