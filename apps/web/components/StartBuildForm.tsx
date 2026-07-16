"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SEED_IDEA_MAX_LENGTH } from "@launchblitz/db";

export function StartBuildForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const body = await res.json();

      if (res.status !== 201) {
        setError(body.error ?? "Failed to start your build.");
        return;
      }

      router.push(`/dashboard/builds/${body.build.id}`);
    } catch {
      setError("Failed to start your build.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label htmlFor="idea" className="sr-only">
        Your idea
      </label>
      <textarea
        id="idea"
        name="idea"
        rows={3}
        maxLength={SEED_IDEA_MAX_LENGTH}
        placeholder="A tax planner for solo creators…"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        className="w-full rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#CFD8DC]/40 focus:border-[#FF4D00]/40 focus:outline-none"
      />
      <div className="flex items-center justify-between gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Start new build"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
