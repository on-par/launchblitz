import { StageCard } from "@launchblitz/ui";

const builds = [
  { name: "Creator tax planner", stage: "Avatar", status: "Active" },
  { name: "Pet supplement landing page", stage: "Lovable export", status: "Review" },
];

export default function DashboardHomePage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-black/45">Dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold">Build sessions</h1>
        </div>
        <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
          Start new build
        </button>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {builds.map((build) => (
          <StageCard
            key={build.name}
            description={`${build.status} at ${build.stage}`}
            title={build.name}
          />
        ))}
      </div>
    </section>
  );
}
