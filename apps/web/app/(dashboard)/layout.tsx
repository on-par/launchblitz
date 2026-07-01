import type { ReactNode } from "react";
import Link from "next/link";
import { LaunchBlitzWordmark } from "../../components/LaunchBlitzWordmark";

const navItems = [
  { href: "/builds", label: "Builds", detail: "Launch sessions and review outputs" },
  { href: "/settings/keys", label: "Key vault", detail: "Connect provider credentials" },
  { href: "/settings/billing", label: "Billing", detail: "Plans, exports, and usage" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.14),transparent_24%),linear-gradient(180deg,#050505_0%,#0b0b0b_100%)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-white/10 bg-black/55 p-6 backdrop-blur-xl lg:border-b-0 lg:border-r">
          <Link className="inline-flex" href="/builds">
            <LaunchBlitzWordmark className="h-10 w-auto" />
          </Link>
          <p className="mt-6 max-w-xs text-sm leading-6 text-[#CFD8DC]/64">
            One-session workspace for validation, positioning, copy, and launch handoff.
          </p>
          <div className="mt-8 rounded-[1.75rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#ff9a71]">
              Builder cockpit
            </p>
            <p className="mt-3 text-sm leading-6 text-[#ECEFF1]/76">
              Keep your AI keys connected, step through the workflow, and move from idea
              to assets without leaving the same system.
            </p>
          </div>
          <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="block rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-white/82 transition hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/10 hover:text-white"
              href={item.href}
            >
              <span className="block text-sm font-semibold tracking-[-0.02em]">{item.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#CFD8DC]/54">{item.detail}</span>
            </Link>
          ))}
          </nav>
        </aside>
        <main className="px-5 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
