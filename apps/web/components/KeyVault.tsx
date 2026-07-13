"use client";

import { useEffect, useState } from "react";

const COMING_SOON_PROVIDERS = ["OpenAI", "Perplexity", "Exploding Topics", "Jasper", "Lovable", "Tidio"];

type AnthropicKeyState = {
  saved: boolean;
  keyHint: string | null;
  updatedAt: string | null;
};

export function KeyVault() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AnthropicKeyState>({ saved: false, keyHint: null, updatedAt: null });
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/keys");
        if (!res.ok) {
          return;
        }
        const body = await res.json();
        const anthropic = body.providers?.find(
          (p: { provider: string }) => p.provider === "anthropic",
        ) as AnthropicKeyState | undefined;
        if (!cancelled && anthropic) {
          setState(anthropic);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "anthropic", key }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Failed to save key.");
        return;
      }

      setState({ saved: true, keyHint: body.keyHint, updatedAt: body.updatedAt });
      setKey("");
    } catch {
      setError("Failed to save key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Settings</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">Key vault</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Plug in the providers that power your LaunchBlitz session so every stage can run
          under accounts you control.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Anthropic</h2>
              <p className="mt-2 text-sm leading-6 text-[#CFD8DC]/58">
                Powers idea, market, avatar, and copy stage generation.
              </p>
            </div>
            {!loading && state.saved && (
              <span className="whitespace-nowrap rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-4 py-2 text-sm font-semibold text-[#ff9a71]">
                Saved &middot; {state.keyHint}
              </span>
            )}
          </div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSave}>
            <input
              type="password"
              autoComplete="off"
              placeholder="sk-ant-..."
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-[#CFD8DC]/40 focus:border-[#FF4D00]/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={saving || key.length === 0}
              className="rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-4 py-2 text-sm font-semibold text-[#ff9a71] transition hover:bg-[#FF4D00] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </article>
        {COMING_SOON_PROVIDERS.map((provider) => (
          <article
            key={provider}
            className="rounded-[1.7rem] border border-white/10 bg-white/[0.02] p-5 opacity-60"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{provider}</h2>
                <p className="mt-2 text-sm leading-6 text-[#CFD8DC]/58">Coming soon.</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
