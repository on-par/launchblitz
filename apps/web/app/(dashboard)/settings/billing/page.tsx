const tiers = [
  { name: "Free", price: "$0", details: "1 build, no export" },
  { name: "Builder", price: "$29", details: "10 builds and Lovable export" },
  { name: "Pro", price: "$79", details: "Unlimited builds, team seats, customization" },
];

export default function BillingPage() {
  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Billing</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          Plans and portal
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Keep the pricing model aligned with the public site while managing exports and
          higher-volume sessions from one place.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`rounded-[1.8rem] border p-6 ${
              tier.name === "Builder"
                ? "border-[#FF4D00] bg-[#FF4D00] text-black shadow-[0_24px_80px_rgba(255,77,0,0.24)]"
                : "border-white/10 bg-white/[0.03] text-white"
            }`}
          >
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">{tier.name}</h2>
            <p className="mt-3 text-4xl font-bold tracking-[-0.06em]">{tier.price}</p>
            <p
              className={`mt-3 text-sm leading-6 ${
                tier.name === "Builder" ? "text-black/72" : "text-[#CFD8DC]/58"
              }`}
            >
              {tier.details}
            </p>
            <button
              className={`mt-8 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tier.name === "Builder"
                  ? "bg-black text-white hover:bg-[#111]"
                  : "border border-white/10 bg-white/[0.05] text-white hover:border-[#FF4D00]/25 hover:bg-[#FF4D00]/10"
              }`}
            >
              {tier.name === "Builder" ? "Current recommendation" : "Choose plan"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
