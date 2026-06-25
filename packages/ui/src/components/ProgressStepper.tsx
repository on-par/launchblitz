export function ProgressStepper({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      {steps.map((step, index) => {
        const active = index === currentStep;
        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              active ? "border-[var(--accent)] bg-white" : "border-black/10 bg-white/60"
            }`}
          >
            <p className="font-semibold">{index + 1}</p>
            <p className="mt-1 text-black/65">{step}</p>
          </div>
        );
      })}
    </div>
  );
}
