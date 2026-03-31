import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthField, AuthFooter, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";
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
  const copy = AUTH_MODE_COPY["reset-password"];

  if (!data.user) {
    return (
      <AuthShell>
        <AuthIntro eyebrow={copy.eyebrow} title="Set new password" subtitle="Reset link expired. Request a new password reset to continue." />
        <AuthCard>
          <Link
            href="/forgot-password"
            className="inline-flex rounded-md bg-accent px-3 py-2 text-sm text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          >
            Request new reset link
          </Link>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthIntro eyebrow={copy.eyebrow} title="Set new password" subtitle="Choose and confirm a new password for your account." />
      <AuthCard>
        <form action={updatePasswordAction} className="space-y-5">
          <div className="space-y-4">
            <AuthField label="New password">
              <Input type="password" name="password" minLength={6} required autoComplete="new-password" placeholder="Enter new password" />
            </AuthField>
            <AuthField label="Confirm new password">
              <Input type="password" name="confirmPassword" minLength={6} required autoComplete="new-password" placeholder="Confirm new password" />
            </AuthField>
          </div>
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          <PrimaryButton type="submit" fullWidth>
            Save new password
          </PrimaryButton>
        </form>
        <AuthFooter>
          <p className="text-xs leading-5 text-slate-500">{copy.helper}</p>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
