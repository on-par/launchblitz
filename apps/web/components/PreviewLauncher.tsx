"use client";

import { useEffect, useState } from "react";

export interface PreviewLauncherProps {
  endpoint: string;
  disabledReason?: string | null;
}

type LauncherState =
  | { kind: "idle" }
  | { kind: "starting"; phase: string; logs: string[] }
  | { kind: "ready"; url: string; expiresAt: string }
  | { kind: "failed"; error: string; logs: string[] };

const LINK_CLASSNAME =
  "rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/80 transition hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/10 hover:text-white";

const DISABLED_CLASSNAME =
  "rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/40";

const PHASE_LABELS: Record<string, string> = {
  "creating-workspace": "Setting up a secure workspace…",
  "writing-files": "Uploading your landing page…",
  "starting-server": "Starting the preview server…",
};

function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? "Preparing your preview…";
}

function LogsBlock({ logs, open }: { logs: string[]; open?: boolean }) {
  if (logs.length === 0) {
    return null;
  }
  return (
    <details className="w-full text-left" open={open}>
      <summary className="cursor-pointer text-xs text-[#CFD8DC]/50">Raw logs</summary>
      <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-[#CFD8DC]/70">
        {logs.join("\n")}
      </pre>
    </details>
  );
}

interface StatusResponseBody {
  status: {
    phase: string;
    logs: Array<{ message: string }>;
    url: string | null;
    expiresAt: string | null;
    error: string | null;
  };
}

function toLogMessages(logs: Array<{ message: string }>): string[] {
  return logs.map((entry) => entry.message);
}

export function PreviewLauncher({ endpoint, disabledReason }: PreviewLauncherProps) {
  const [state, setState] = useState<LauncherState>({ kind: "idle" });

  useEffect(() => {
    if (disabledReason) {
      return;
    }
    let cancelled = false;

    fetch(`${endpoint}/status`)
      .then(async (res) => {
        if (res.status !== 200 || cancelled) {
          return;
        }
        const body: StatusResponseBody = await res.json();
        const { status } = body;

        if (status.phase === "ready" && status.url && status.expiresAt) {
          setState({ kind: "ready", url: status.url, expiresAt: status.expiresAt });
        } else if (status.phase === "failed") {
          setState({ kind: "failed", error: status.error ?? "Failed to start the preview.", logs: toLogMessages(status.logs) });
        } else if (status.phase !== "idle") {
          setState({ kind: "starting", phase: status.phase, logs: toLogMessages(status.logs) });
        }
      })
      .catch(() => {
        // No status available yet — leave the launcher in its default state.
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, disabledReason]);

  useEffect(() => {
    if (state.kind !== "starting") {
      return;
    }
    let cancelled = false;

    const interval = setInterval(() => {
      fetch(`${endpoint}/status`)
        .then(async (res) => {
          if (res.status !== 200 || cancelled) {
            return;
          }
          const body: StatusResponseBody = await res.json();
          const { status } = body;

          if (status.phase === "ready" && status.url && status.expiresAt) {
            setState({ kind: "ready", url: status.url, expiresAt: status.expiresAt });
          } else if (status.phase === "failed") {
            setState({
              kind: "failed",
              error: status.error ?? "Failed to start the preview.",
              logs: toLogMessages(status.logs),
            });
          } else {
            setState({ kind: "starting", phase: status.phase, logs: toLogMessages(status.logs) });
          }
        })
        .catch(() => {
          // Transient poll failure — keep the current starting state and try again next tick.
        });
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [endpoint, state.kind]);

  // Revert to the "Start preview" button once the sandbox's TTL elapses, so
  // the UI doesn't keep advertising a link that has already stopped serving.
  useEffect(() => {
    if (state.kind !== "ready") {
      return;
    }
    const msUntilExpiry = Math.max(0, new Date(state.expiresAt).getTime() - Date.now());
    const timer = setTimeout(() => setState({ kind: "idle" }), msUntilExpiry);
    return () => clearTimeout(timer);
  }, [state]);

  if (disabledReason) {
    return (
      <span className={DISABLED_CLASSNAME} title={disabledReason}>
        Start preview
      </span>
    );
  }

  async function handleStart() {
    setState({ kind: "starting", phase: "creating-workspace", logs: [] });

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json();

      if (res.status !== 200 && res.status !== 201) {
        const logs = await fetch(`${endpoint}/status`)
          .then((statusRes) => (statusRes.status === 200 ? statusRes.json() : null))
          .then((statusBody: StatusResponseBody | null) => (statusBody ? toLogMessages(statusBody.status.logs) : []))
          .catch(() => []);
        setState({ kind: "failed", error: body.error ?? "Failed to start the preview.", logs });
        return;
      }

      setState({ kind: "ready", url: body.preview.url, expiresAt: body.preview.expiresAt });
    } catch {
      const logs = await fetch(`${endpoint}/status`)
        .then((statusRes) => (statusRes.status === 200 ? statusRes.json() : null))
        .then((statusBody: StatusResponseBody | null) => (statusBody ? toLogMessages(statusBody.status.logs) : []))
        .catch(() => []);
      setState({ kind: "failed", error: "Failed to start the preview.", logs });
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <a href={state.url} target="_blank" rel="noreferrer" className={LINK_CLASSNAME}>
          Open live preview
        </a>
        <span className="text-xs text-[#CFD8DC]/50">
          Expires at {new Date(state.expiresAt).toLocaleTimeString()}
        </span>
      </div>
    );
  }

  if (state.kind === "starting") {
    return (
      <div className="flex w-full max-w-md flex-col items-end gap-2">
        <button
          type="button"
          disabled
          className={`${LINK_CLASSNAME} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {phaseLabel(state.phase)}
        </button>
        <LogsBlock logs={state.logs} />
      </div>
    );
  }

  if (state.kind === "failed") {
    return (
      <div className="flex w-full max-w-md flex-col items-end gap-2">
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
        <LogsBlock logs={state.logs} open />
        <button type="button" onClick={handleStart} className={LINK_CLASSNAME}>
          Retry preview
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleStart}
        className={`${LINK_CLASSNAME} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Start preview
      </button>
    </div>
  );
}
