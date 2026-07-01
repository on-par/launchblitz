import { authenticate } from "./actions";

// Minimal credential form shared by sign-in and sign-up. The hidden
// `redirect_url` carries the visitor's original intent through authentication
// so the server action can return them to it. The email/password fields are the
// surface a real provider (Supabase/Clerk) will drive; the submit routes.
export function AuthForm({
  redirectUrl,
  submitLabel,
}: {
  redirectUrl: string;
  submitLabel: string;
}) {
  return (
    <form action={authenticate} className="mt-8 flex flex-col gap-4">
      <input name="redirect_url" type="hidden" value={redirectUrl} />
      <label className="flex flex-col gap-2 text-left text-sm text-[#CFD8DC]/70">
        Email
        <input
          autoComplete="email"
          className="h-12 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#FF4D00]"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>
      <label className="flex flex-col gap-2 text-left text-sm text-[#CFD8DC]/70">
        Password
        <input
          autoComplete="current-password"
          className="h-12 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#FF4D00]"
          minLength={8}
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </label>
      <button
        className="mt-2 h-12 rounded-full bg-[#FF4D00] px-5 text-sm font-semibold text-white transition hover:bg-[#e94700]"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}
