"use client";

import { useEffect, useState } from "react";

export interface PreviewLauncherProps {
  endpoint: string;
  disabledReason?: string | null;
}

interface PreviewState {
  url: string;
  expiresAt: string;
}

const LINK_CLASSNAME =
  "rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/80 transition hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/10 hover:text-white";

const DISABLED_CLASSNAME =
  "rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/40";

export function PreviewLauncher({ endpoint, disabledReason }: PreviewLauncherProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabledReason) {
      return;
    }
    let cancelled = false;

    fetch(endpoint)
      .then(async (res) => {
        if (res.status !== 200 || cancelled) {
          return;
        }
        const body = await res.json();
        setPreview(body.preview);
      })
      .catch(() => {
        // No active preview yet — leave the launcher in its default state.
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, disabledReason]);

  // Revert to the "Start preview" button once the sandbox's TTL elapses, so
  // the UI doesn't keep advertising a link that has already stopped serving.
  useEffect(() => {
    if (!preview) {
      return;
    }
    const msUntilExpiry = Math.max(0, new Date(preview.expiresAt).getTime() - Date.now());
    const timer = setTimeout(() => setPreview(null), msUntilExpiry);
    return () => clearTimeout(timer);
  }, [preview]);

  if (disabledReason) {
    return (
      <span className={DISABLED_CLASSNAME} title={disabledReason}>
        Start preview
      </span>
    );
  }

  async function handleStart() {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json();

      if (res.status !== 200 && res.status !== 201) {
        setError(body.error ?? "Failed to start the preview.");
        return;
      }

      setPreview(body.preview);
    } catch {
      setError("Failed to start the preview.");
    } finally {
      setStarting(false);
    }
  }

  if (preview) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <a href={preview.url} target="_blank" rel="noreferrer" className={LINK_CLASSNAME}>
          Open live preview
        </a>
        <span className="text-xs text-[#CFD8DC]/50">
          Expires at {new Date(preview.expiresAt).toLocaleTimeString()}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleStart}
        disabled={starting}
        className={`${LINK_CLASSNAME} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {starting ? "Starting preview…" : "Start preview"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
