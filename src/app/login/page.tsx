import Link from "next/link";
import { login } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    verified?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorCode = searchParams?.error;
  const error =
    errorCode === "confirm_failed"
      ? "Could not verify your link. Please request a new one."
      : errorCode === "recovery_session_missing"
        ? "Your reset link expired. Please request a new one."
        : errorCode;

  const info =
    searchParams?.verified === "1" || searchParams?.info === "confirmed"
      ? "Email verified. You can log in now."
      : searchParams?.info;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">
      <form action={login} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            type="password"
            name="password"
            minLength={6}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-accent">{info}</p> : null}
        <button type="submit" className="w-full rounded-md bg-accent px-3 py-2 text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
          Log in
        </button>
        <div className="flex justify-between text-sm">
          <div className="space-y-1">
            <Link className="underline" href="/forgot-password">
              Forgot password?
            </Link>
            <p className="text-xs text-slate-500">Didn’t get the email? Check spam/junk.</p>
          </div>
          <Link className="underline" href="/signup">
            Create account
          </Link>
        </div>
      </form>
    </main>
  );
}
