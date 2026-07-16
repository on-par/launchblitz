import Link from "next/link";
import { ProviderReadinessPanel } from "../../../components/ProviderReadinessPanel";
import { StartBuildForm } from "../../../components/StartBuildForm";
import { getSession } from "../../../lib/auth";
import { getBuildsRepository } from "../../../lib/builds";
import { toBuildListItem } from "../../../lib/build-list";
import { getProviderKeysRepository } from "../../../lib/provider-keys";
import { toProviderReadiness } from "../../../lib/provider-readiness";

const KEY_VAULT_HREF = "/settings/keys?returnTo=/builds";

export default async function BuildsPage() {
  const session = await getSession();
  const records = session ? await getBuildsRepository().listForUser(session.userId) : [];
  const items = records.map(toBuildListItem);

  const keyRows = session ? await getProviderKeysRepository().list(session.userId) : [];
  const readiness = toProviderReadiness(keyRows);

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

      {session ? (
        <ProviderReadinessPanel readiness={readiness} keyVaultHref={KEY_VAULT_HREF} />
      ) : null}

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/46">
          New build
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">What are you launching?</h2>
        <div className="mt-4">
          <StartBuildForm missingProviders={readiness.missingLabels} keyVaultHref={KEY_VAULT_HREF} />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[#080808] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/46">
              Your builds
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Resume where you left off
            </h2>
          </div>
          <p className="text-sm text-[#CFD8DC]/58">Founder-led reviews with export-ready outputs</p>
        </div>

        {items.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5"
              >
                <h3 className="line-clamp-2 text-lg font-semibold text-white">{item.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff9a71]">
                    {item.status}
                  </span>
                  <span className="text-sm text-[#CFD8DC]/58">Stage: {item.stageLabel}</span>
                  <span className="text-sm text-[#CFD8DC]/58">Updated {item.updatedLabel}</span>
                </div>
                <Link
                  href={item.resumeHref}
                  className="mt-4 inline-block rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
                >
                  Resume build
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
            <h3 className="text-lg font-semibold text-white">No builds yet</h3>
            <p className="mt-2 text-sm leading-6 text-[#CFD8DC]/66">
              Describe your idea above and LaunchBlitz will walk it from idea capture to a
              launch packet you can hand off.
            </p>
            <a
              href="#idea"
              className="mt-4 inline-block rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
            >
              Start your first build
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
