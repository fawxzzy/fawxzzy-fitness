import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import { RecoverySessionBridge } from "@/app/reset-password/RecoverySessionBridge";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthField, AuthFooter, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: {
    error?: string;
    recovery?: string;
  };
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const error = searchParams?.error;
  const isRecoveryAttempt = searchParams?.recovery === "1";
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const copy = AUTH_MODE_COPY["reset-password"];

  if (!data.user) {
    return (
      <AuthShell>
        <AuthIntro
          eyebrow={copy.eyebrow}
          title="Set new password"
          subtitle={isRecoveryAttempt ? "Finishing your password reset link." : "Reset link expired. Request a new password reset to continue."}
        />
        <AuthCard>
          {isRecoveryAttempt ? (
            <RecoverySessionBridge initialError={error} />
          ) : (
            <Link
              href="/forgot-password"
              className={appTokens.authInlineAction}
            >
              Request new reset link
            </Link>
          )}
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
          <p className={appTokens.authHelperTextMuted}>{copy.helper}</p>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
