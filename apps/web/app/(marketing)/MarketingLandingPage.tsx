"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LaunchBlitzWordmark } from "../../components/LaunchBlitzWordmark";
import { START_BUILD_PATH } from "../../lib/session";

const painPoints = ["Too many tools.", "Hours of research.", "Blank page paralysis."];

const workflowSteps = [
  {
    eyebrow: "Drop your idea",
    title: "Start with one clear business concept and your own AI keys.",
    body: "Give LaunchBlitz the idea in plain English and begin the session without stitching together a dozen tools by hand.",
  },
  {
    eyebrow: "Guided research",
    title: "LaunchBlitz structures the heavy early-stage business work into one guided sequence.",
    body: "You get Market Validation, Customer Avatar, Copy Deck, Landing Page Export, and a Launch Kit in one structured flow.",
  },
  {
    eyebrow: "Review, approve, launch",
    title: "You stay in control while the system removes the busywork.",
    body: "Refine the outputs, approve what works, and move into launch mode with real assets instead of an empty page.",
  },
];

const deliverables = [
  "Market Validation",
  "Customer Avatar",
  "Copy Deck",
  "Landing Page Export",
  "Launch Kit",
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    details: "1 build",
    cta: "Start free",
    action: "start" as const,
    featured: false,
  },
  {
    name: "Builder",
    price: "$29/mo",
    details: "10 builds + Lovable export",
    cta: "Start free",
    action: "start" as const,
    featured: true,
  },
  {
    name: "Pro",
    price: "$79/mo",
    details: "Unlimited + team",
    cta: "Join waitlist",
    action: "waitlist" as const,
    featured: false,
  },
];

const faqs = [
  {
    question: "What AI keys do I need?",
    answer:
      "Bring your own AI provider keys. The session runs entirely through accounts you already control.",
  },
  {
    question: "How long does a session take?",
    answer:
      "It is designed to finish in one focused working session, not over a week of tab switching, rewrites, and scattered prompting.",
  },
  {
    question: "Can I edit the outputs?",
    answer:
      "Yes. Everything is reviewable and editable before you move forward, so the workflow stays collaborative and founder-led.",
  },
  {
    question: 'What does "Lovable export" mean?',
    answer:
      "Builder and above include a landing page handoff shaped for Lovable so you can move from research and copy into build mode faster.",
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

// Primary CTA: routes into the authenticated start-build flow (issue #7).
// Anonymous visitors are gated to sign-in with a return path by the middleware;
// signed-in visitors land straight on the builds surface.
function StartBuildLink({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <Link className={className} href={START_BUILD_PATH}>
      {label}
    </Link>
  );
}

export function InlineWaitlist({
  triggerLabel,
  triggerClassName,
}: {
  triggerLabel: string;
  triggerClassName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="w-full max-w-md">
      <button className={triggerClassName} onClick={() => setIsOpen(true)} type="button">
        {triggerLabel}
      </button>
      {isOpen ? (
        <div className="mt-4 rounded-[1.6rem] border border-[#FF4D00]/15 bg-[#f7f7f6] p-4 text-left text-black shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
          {isSubmitted ? (
            <p className="text-sm font-semibold tracking-[-0.02em]">You&apos;re on the list!</p>
          ) : (
            <>
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError(false);
                  setIsSubmitting(true);
                  fetch("/api/waitlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  })
                    .then((response) => {
                      if (response.ok) {
                        setIsSubmitted(true);
                      } else {
                        setError(true);
                      }
                    })
                    .catch(() => {
                      setError(true);
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
              >
                <input
                  aria-label="Email address"
                  className="h-12 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#FF4D00]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  required
                  type="email"
                  value={email}
                />
                <button
                  className="h-12 rounded-full bg-[#FF4D00] px-5 text-sm font-semibold text-white transition hover:bg-[#e94700] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Joining…" : "Join waitlist"}
                </button>
              </form>
              {error ? (
                <p className="mt-2 text-xs text-[#FF4D00]">
                  Something went wrong — please try again.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MarketingLandingPage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY;
      setShowStickyCta(heroBottom < 120);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main className="bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/">
            <LaunchBlitzWordmark className="h-11 w-auto sm:h-12" priority />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium tracking-[-0.01em] text-[#ECEFF1]/80 md:flex">
            <a className="transition hover:text-white" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href="#faq">
              FAQ
            </a>
          </nav>
          <StartBuildLink
            className="hidden items-center rounded-full bg-[#FF4D00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700] md:inline-flex"
            label="Start free"
          />
        </div>
      </header>

      <section ref={heroRef} className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,77,0,0.24),transparent_24%),radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:96px_96px]" />
        <div className="absolute left-1/2 top-[-16rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#FF4D00]/18 blur-[140px]" />
        <div className="mx-auto grid min-h-[calc(100vh-77px)] max-w-7xl items-center gap-14 px-4 py-18 sm:px-6 lg:grid-cols-[minmax(0,1fr)_31rem] lg:px-8 lg:py-24">
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ECEFF1]/72">
              <Spark />
              Founder&apos;s SaaS platform
            </div>
            <h1 className="mt-8 max-w-5xl text-[3.5rem] font-extrabold leading-[0.9] tracking-[-0.07em] text-white sm:text-[4.7rem] lg:text-[6.5rem]">
              Launch your business idea.
              <span className="block text-[#FF4D00]">In one session.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-[#ECEFF1]/72 sm:text-lg">
              LaunchBlitz turns one raw concept into research, positioning, copy, and a
              Lovable-ready launch packet so founders can move from blank page to momentum
              with a single guided workflow.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <StartBuildLink
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#FF4D00] px-6 text-sm font-semibold text-white transition hover:bg-[#e94700]"
                label="Start for free"
              />
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/14 bg-white/[0.03] px-6 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/[0.06]"
                href="#how-it-works"
              >
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-[#CFD8DC]/60">
              No credit card required · Bring your own AI keys
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.42)]">
              <div className="rounded-[1.65rem] border border-white/10 bg-[#080808] p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[#CFD8DC]/46">
                      Session output
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Launch packet</h2>
                  </div>
                  <div className="rounded-full border border-[#FF4D00]/40 bg-[#FF4D00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a71]">
                    preview
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {deliverables.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECEFF1] text-xs font-semibold text-black">
                          0{index + 1}
                        </span>
                        <span className="text-sm text-[#ECEFF1]/88">{item}</span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.24em] text-[#CFD8DC]/40">
                        included
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[1.2rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 px-4 py-3 text-sm text-[#ECEFF1]/82">
                  Guided sequence for research, copy, and launch outputs.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#050505]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
          {painPoints.map((item) => (
            <div
              key={item}
              className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 text-xl font-semibold tracking-[-0.04em] text-white"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0a0a]" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#CFD8DC]/46">
                How it works
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">
                One founder workflow instead of scattered prompts and disconnected tools.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-[#ECEFF1]/62">
              The system turns early-stage business setup into a finishable sequence with
              clear outputs and fewer handoffs.
            </p>
          </div>

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

      <section className="border-b border-white/10 bg-[#050505]" id="pricing">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#CFD8DC]/46">
              Pricing
            </p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">
              Simple. Cancel anytime.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-[2rem] border p-6 ${
                  tier.featured
                    ? "border-[#FF4D00] bg-[#FF4D00] text-black shadow-[0_28px_100px_rgba(255,77,0,0.28)]"
                    : "border-white/10 bg-white/[0.03] text-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-[-0.04em]">{tier.name}</h3>
                    <p
                      className={`mt-3 text-4xl font-extrabold tracking-[-0.06em] ${
                        tier.featured ? "text-black" : "text-white"
                      }`}
                    >
                      {tier.price}
                    </p>
                  </div>
                  {tier.featured ? (
                    <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-4 text-sm leading-7 ${
                    tier.featured ? "text-black/75" : "text-[#ECEFF1]/64"
                  }`}
                >
                  {tier.details}
                </p>
                <div className="mt-8">
                  {tier.action === "start" ? (
                    <StartBuildLink
                      className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                        tier.featured
                          ? "bg-black text-white hover:bg-[#111]"
                          : "bg-white text-black hover:bg-white/85"
                      }`}
                      label={tier.cta}
                    />
                  ) : (
                    <InlineWaitlist
                      triggerClassName={`inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                        tier.featured
                          ? "bg-black text-white hover:bg-[#111]"
                          : "bg-white text-black hover:bg-white/85"
                      }`}
                      triggerLabel={tier.cta}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0a0a]" id="faq">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#CFD8DC]/46">
              FAQ
            </p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">
              Everything you need to know before your first session.
            </h2>
          </div>
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

      <section className="bg-black">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#CFD8DC]/46">
            Final step
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">
            Your next business is one session away.
          </h2>
          <div className="mt-10">
            <StartBuildLink
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#FF4D00] px-6 text-sm font-semibold text-white transition hover:bg-[#e94700]"
              label="Start free"
            />
          </div>
        </div>
      </section>

      {showStickyCta ? (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <InlineWaitlist
            triggerClassName="inline-flex h-12 items-center justify-center rounded-full bg-[#FF4D00] px-6 text-sm font-semibold text-white shadow-[0_16px_48px_rgba(255,77,0,0.32)] transition hover:bg-[#e94700]"
            triggerLabel="Join waitlist"
          />
        </div>
      ) : null}
    </main>
  );
}
