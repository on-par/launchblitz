import Link from "next/link";

const stages = [
  "Idea capture",
  "Market validation",
  "Customer avatar",
  "Positioning",
  "Copy deck",
  "Visual identity",
  "Lovable export",
  "Domain suggestion",
  "Launch kit",
  "Tidio setup",
];

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <section className="grid gap-10 rounded-[2rem] border border-black/5 bg-white/70 p-10 shadow-[0_20px_80px_rgba(24,33,47,0.08)] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-black/50">LaunchBlitz</p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight">
            Build a business in one session.
          </h1>
          <p className="max-w-xl text-lg text-black/70">
            Research the market, shape the brand, generate the landing page brief, and leave
            with launch assets in a single guided workflow.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white"
              href="/sign-up"
            >
              Join the waitlist
            </Link>
            <Link className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold" href="/dashboard">
              Preview dashboard
            </Link>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-black/10 bg-[var(--card)] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/50">Workflow</p>
          <ol className="mt-4 space-y-3">
            {stages.map((stage, index) => (
              <li
                key={stage}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)] text-sm font-semibold">
                  {index + 1}
                </span>
                <span>{stage}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
