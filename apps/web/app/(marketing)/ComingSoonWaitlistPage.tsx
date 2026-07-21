import { LaunchBlitzWordmark } from "../../components/LaunchBlitzWordmark";
import { deliverables, workflowSteps } from "./copy";
import { InlineWaitlist } from "./InlineWaitlist";

const faqs = [
  {
    question: "What is LaunchBlitz?",
    answer:
      "LaunchBlitz takes one raw business idea and works it through a guided session into research, positioning, copy, and a Lovable-ready launch packet — so you finish with real launch assets instead of a folder of half-written notes.",
  },
  {
    question: "When does it launch?",
    answer:
      "We're finishing the guided workflow now and haven't committed to a public date. Join the waitlist and we'll email you the moment it opens — waitlist members get in first.",
  },
  {
    question: "What will it cost?",
    answer:
      "There will be a free tier so you can run your first build without paying, plus a paid plan for founders running builds regularly. Final pricing lands with launch, and waitlist members get first access to Builder pricing.",
  },
  {
    question: "What AI keys do I need?",
    answer:
      "Bring your own AI provider keys. The session runs entirely through accounts you already control.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your work stays tied to your workspace and your own model keys. Waitlist signups are stored securely and only used to notify you about LaunchBlitz.",
  },
];

function Spark() {
  return <span aria-hidden="true" className="text-lg leading-none text-[#FF4D00]">*</span>;
}

export function ComingSoonWaitlistPage() {
  return (
    <main className="bg-black text-white">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
          <LaunchBlitzWordmark className="h-11 w-auto sm:h-12" priority />
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,77,0,0.24),transparent_24%),radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:96px_96px]" />
        <div className="absolute left-1/2 top-[-16rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#FF4D00]/18 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ECEFF1]/72">
              <Spark />
              Founder&apos;s SaaS platform
            </div>
            <h1 className="mt-8 text-[3.5rem] font-extrabold leading-[0.9] tracking-[-0.07em] text-white sm:text-[4.7rem]">
              Launch your business idea.
              <span className="block text-[#FF4D00]">Coming soon.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#ECEFF1]/72 sm:text-lg">
              LaunchBlitz turns one raw idea into research, positioning, copy, and a
              Lovable-ready launch packet in a single guided session. We&apos;re finishing the
              guided workflow before opening it up. Join the waitlist and we&apos;ll email you
              the moment it&apos;s ready.
            </p>
            <div className="mt-10 flex justify-center">
              <InlineWaitlist
                defaultOpen
                errorMessage="That didn't go through. Try again in a moment."
                fieldLabel="Email address"
                submitLabel="Join the waitlist"
                successMessage="You're on the list. We'll email you the moment LaunchBlitz opens, and waitlist members get first access to Builder pricing."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0a0a]" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#CFD8DC]/46">
            How it works
          </p>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step.eyebrow}
                className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#CFD8DC]/42">
                    {step.eyebrow}
                  </p>
                  <span className="text-sm font-semibold text-[#FF4D00]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-2xl font-bold tracking-[-0.05em] text-white">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#ECEFF1]/64">{step.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            {deliverables.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#ECEFF1]/76"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#050505]" id="faq">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#CFD8DC]/46">
            FAQ
          </p>
          <div className="mt-12 divide-y divide-white/10 rounded-[2rem] border border-white/10 bg-white/[0.03]">
            {faqs.map((faq) => (
              <article key={faq.question} className="px-6 py-6 sm:px-8">
                <h3 className="text-lg font-bold tracking-[-0.03em] text-white">{faq.question}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#ECEFF1]/64">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
          <LaunchBlitzWordmark className="h-9 w-auto" />
        </div>
      </footer>
    </main>
  );
}
