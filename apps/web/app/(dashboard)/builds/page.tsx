import { StageCard } from "@launchblitz/ui";
import { StartBuildForm } from "../../../components/StartBuildForm";

const builds = [
  { name: "Creator tax planner", stage: "Avatar", status: "Active" },
  { name: "Pet supplement landing page", stage: "Lovable export", status: "Review" },
];

const metrics = [
  { label: "Active sessions", value: "02" },
  { label: "Average session", value: "47 min" },
  { label: "Exports ready", value: "05" },
];

export default function BuildsPage() {
  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          Build sessions
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Run the full LaunchBlitz sequence, review the outputs at each stage, and keep
          your launch packet moving without bouncing between tools.
        </p>
      </header>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/46">
          New build
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">What are you launching?</h2>
        <div className="mt-4">
          <StartBuildForm />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/46">
              {metric.label}
            </p>
            <p className="mt-4 text-4xl font-bold tracking-[-0.06em] text-white">{metric.value}</p>
          </article>
        ))}
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[#080808] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/46">
              Session board
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Current launch queue
            </h2>
          </div>
          <p className="text-sm text-[#CFD8DC]/58">Founder-led reviews with export-ready outputs</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
        {builds.map((build) => (
          <div key={build.name} className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-1">
            <StageCard description={`${build.status} at ${build.stage}`} title={build.name} />
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
