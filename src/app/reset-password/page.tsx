import { resetPasswordAction } from "@/app/reset-password/actions";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: {
    error?: string;
    email?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const error = searchParams?.error;
  const email = searchParams?.email;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">
      <form action={resetPasswordAction} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="text-sm text-slate-600">
          {email ? `Create a new password for ${email}.` : "Create your new password to regain access."}
        </p>
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
          Save new password
        </button>
      </form>
    </main>
  );
}
