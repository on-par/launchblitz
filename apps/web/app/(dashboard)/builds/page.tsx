import Link from "next/link";
import { StageCard } from "@launchblitz/ui";
import { getCurrentUserId } from "../../../lib/auth";
import { getBuildsRepository } from "../../../lib/builds";

// Reads per-user builds, so it must be rendered per request (never prerendered).
export const dynamic = "force-dynamic";

const stageLabels = [
  "Idea",
  "Market",
  "Avatar",
  "Positioning",
  "Copy",
  "Brand",
  "Export",
  "Launch",
];

function stageLabel(currentStage: number): string {
  return stageLabels[currentStage] ?? `Stage ${currentStage + 1}`;
}

function titleFor(seedIdea: string): string {
  const trimmed = seedIdea.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 79)}…` : trimmed;
}

export default async function BuildsPage() {
  const userId = await getCurrentUserId();
  const builds = userId ? await getBuildsRepository().listByUser(userId) : [];

  const activeCount = builds.filter((build) => build.status === "active").length;
  const metrics = [
    { label: "Total builds", value: String(builds.length).padStart(2, "0") },
    { label: "Active", value: String(activeCount).padStart(2, "0") },
    { label: "In review", value: String(builds.length - activeCount).padStart(2, "0") },
  ];

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
            Build sessions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
            Run the full LaunchBlitz sequence, review the outputs at each stage, and keep
            your launch packet moving without bouncing between tools.
          </p>
        </div>
        <Link
          href="/builds/new"
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
        >
          Start new build
        </Link>
      </header>

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

        {builds.length === 0 ? (
          <div className="mt-5 rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
            <p className="text-sm leading-6 text-[#CFD8DC]/70">
              No builds yet. Drop in your first idea and LaunchBlitz starts working it into a
              launch packet.
            </p>
            <Link
              href="/builds/new"
              className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
            >
              Start your first build
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {builds.map((build) => (
              <Link
                key={build.id}
                href={`/dashboard/builds/${build.id}`}
                className="block rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-1 transition hover:border-[#FF4D00]/30"
              >
                <StageCard
                  description={`${formatStatus(build.status)} · ${stageLabel(build.currentStage)}`}
                  title={titleFor(build.seedIdea)}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function formatStatus(status: string): string {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
