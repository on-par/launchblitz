const providers = [
  "OpenAI",
  "Anthropic",
  "Perplexity",
  "Exploding Topics",
  "Jasper",
  "Lovable",
  "Tidio",
];

export function KeyVault() {
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
        {providers.map((provider) => (
          <article
            key={provider}
            className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{provider}</h2>
                <p className="mt-2 text-sm leading-6 text-[#CFD8DC]/58">
                  Connect, rotate, or revoke provider credentials.
                </p>
              </div>
              <button className="rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-4 py-2 text-sm font-semibold text-[#ff9a71] transition hover:bg-[#FF4D00] hover:text-white">
                Connect
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
