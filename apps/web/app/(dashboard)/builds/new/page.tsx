"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBuildPage() {
  const router = useRouter();
  const [seedIdea, setSeedIdea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedIdea }),
      });
      const data = (await response.json().catch(() => null)) as
        | { build?: { id: string }; error?: string }
        | null;

      if (!response.ok || !data?.build) {
        setError(data?.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/dashboard/builds/${data.build.id}`);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Start a build</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          What are you launching?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Drop in your raw idea — a sentence or a paragraph. LaunchBlitz turns it into a
          build session and works it from capture to a launch packet.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
          <label
            htmlFor="seedIdea"
            className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#CFD8DC]/45"
          >
            Your idea
          </label>
          <textarea
            id="seedIdea"
            name="seedIdea"
            rows={6}
            value={seedIdea}
            onChange={(event) => setSeedIdea(event.target.value)}
            placeholder="e.g. A subscription box of small-batch hot sauces for people who love spicy food."
            className="mt-3 w-full resize-y rounded-[1.2rem] border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white placeholder:text-white/30 focus:border-[#FF4D00]/50 focus:outline-none"
          />
          {error ? (
            <p role="alert" className="mt-3 text-sm text-[#ff9a71]">
              {error}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating build…" : "Create build"}
        </button>
      </form>
    </section>
  );
}
