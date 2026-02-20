import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
  };
};

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">
      <form action={requestPasswordReset} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-slate-600">Enter your email and we’ll send a reset link.</p>
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
        {searchParams?.error ? <p className="text-sm text-red-600">{searchParams.error}</p> : null}
        {searchParams?.info ? <p className="text-sm text-emerald-700">{searchParams.info}</p> : null}
        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
          Send reset link
        </button>
        <p className="text-sm text-slate-600">
          Back to{" "}
          <Link href="/login" className="underline">
            log in
          </Link>
        </p>
      </form>
    </main>
  );
}
