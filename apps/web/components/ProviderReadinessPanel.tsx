import Link from "next/link";
import type { ProviderReadiness } from "../lib/provider-readiness";

export interface ProviderReadinessPanelProps {
  readiness: ProviderReadiness;
  keyVaultHref: string;
}

export function ProviderReadinessPanel({ readiness, keyVaultHref }: ProviderReadinessPanelProps) {
  if (readiness.ready) {
    return (
      <div className="flex flex-wrap gap-2">
        {readiness.providers.map((item) => (
          <span
            key={item.provider}
            className="whitespace-nowrap rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-4 py-2 text-sm font-semibold text-[#ff9a71]"
          >
            {item.label} key ready &middot; {item.keyHint}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[1.8rem] border border-amber-400/30 bg-amber-400/10 p-5">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-amber-200">
        {readiness.missingLabels.join(", ")} key missing
      </p>
      <p className="mt-3 text-sm leading-6 text-[#ECEFF1]/76">
        LaunchBlitz uses your Anthropic key to generate the idea, market, avatar, and copy
        stages. Add it now so your session doesn&apos;t stall mid-build.
      </p>
      <Link
        href={keyVaultHref}
        className="mt-4 inline-block rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
      >
        Add key in Key vault
      </Link>
    </div>
  );
}
