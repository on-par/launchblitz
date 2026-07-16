import { MVP_PROVIDERS, type MvpProvider } from "@launchblitz/db";

export const PROVIDER_LABELS: Record<MvpProvider, string> = { anthropic: "Anthropic" };

export interface ProviderReadinessItem {
  provider: MvpProvider;
  label: string;
  ready: boolean;
  keyHint: string | null;
}

export interface ProviderReadiness {
  /** Every required provider has a saved key. */
  ready: boolean;
  providers: ProviderReadinessItem[];
  missingLabels: string[];
}

/** Map saved key metadata rows onto the required MVP provider list. */
export function toProviderReadiness(
  rows: ReadonlyArray<{ provider: string; keyHint: string | null }>,
): ProviderReadiness {
  const providers = MVP_PROVIDERS.map((provider) => {
    const row = rows.find((r) => r.provider === provider);
    return {
      provider,
      label: PROVIDER_LABELS[provider],
      ready: Boolean(row),
      keyHint: row?.keyHint ?? null,
    };
  });

  return {
    ready: providers.every((item) => item.ready),
    providers,
    missingLabels: providers.filter((item) => !item.ready).map((item) => item.label),
  };
}
