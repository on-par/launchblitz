import Link from "next/link";
import { LaunchBlitzWordmark } from "../../../components/LaunchBlitzWordmark";
import { authHref, resolveRedirect } from "../redirect";
import { AuthForm } from "../AuthForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) {
  const { redirect_url } = await searchParams;
  const redirectUrl = resolveRedirect(redirect_url);
  const signUpHref = authHref("/sign-up", redirectUrl);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-16 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.2),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_32%)]" />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.38)]">
        <Link className="inline-flex" href="/">
          <LaunchBlitzWordmark className="h-11 w-auto" />
        </Link>
        <p className="mt-8 text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Auth</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">Sign in</h1>
        <p className="mt-3 text-sm leading-7 text-[#CFD8DC]/66">
          Sign in to pick up your build where you left off.
        </p>
        <AuthForm redirectUrl={redirectUrl} submitLabel="Sign in" />
        <p className="mt-6 text-sm text-[#CFD8DC]/66">
          New to LaunchBlitz?{" "}
          <Link className="font-semibold text-[#FF4D00] hover:text-[#ff8a5c]" href={signUpHref}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
