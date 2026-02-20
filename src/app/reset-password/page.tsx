import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const error = searchParams?.error;
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-10">
        <section className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-semibold">Set new password</h1>
          <p className="text-sm text-slate-600">Reset link expired. Request a new password reset.</p>
          <Link
            href="/forgot-password"
            className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          >
            Request new reset link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">
      <form action={updatePasswordAction} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-sm text-slate-600">Choose a new password for your account.</p>
        <div>
          <label className="mb-1 block text-sm">New password</label>
          <input
            type="password"
            name="password"
            minLength={6}
            required
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Confirm new password</label>
          <input
            type="password"
            name="confirmPassword"
            minLength={6}
            required
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
          Save new password
        </button>
      </form>
    </main>
  );
}
