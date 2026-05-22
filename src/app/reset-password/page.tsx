import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { RecoverySessionBridge } from "@/app/reset-password/RecoverySessionBridge";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { AuthCard, AuthDock, AuthIntro, AuthShell, AuthStatusText } from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import { ToastFeedbackBridge } from "@/components/ui/ToastFeedbackBridge";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: {
    error?: string;
    recovery?: string;
  };
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const copy = AUTH_MODE_COPY["reset-password"];
  const error = searchParams?.error;
  const isRecoveryAttempt = searchParams?.recovery === "1";

  if (isRecoveryAttempt) {
    return (
      <AuthShell
        header={<AuthIntro eyebrow="" title={copy.title} subtitle="" />}
      >
        <AuthCard className={appTokens.authInteractiveCard}>
          <RecoverySessionBridge initialError={error} />
        </AuthCard>
        <AuthDock>
          <BottomActionSingle>
            <BottomDockLink href="/login" intent="positive">
              Log In
            </BottomDockLink>
          </BottomActionSingle>
        </AuthDock>
      </AuthShell>
    );
  }

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <AuthShell
        header={<AuthIntro eyebrow="" title={copy.title} subtitle="" />}
      >
        <ToastFeedbackBridge error={error ?? "Reset link expired."} />
        <AuthCard className={appTokens.authInteractiveCard}>
          <AuthStatusText>{error ?? "Reset link expired."}</AuthStatusText>
        </AuthCard>
        <AuthDock>
          <BottomActionSingle>
            <BottomDockLink href="/login" intent="positive">
              Log In
            </BottomDockLink>
          </BottomActionSingle>
        </AuthDock>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      header={<AuthIntro eyebrow="" title={copy.title} subtitle="" />}
    >
      <ResetPasswordForm error={error} />
    </AuthShell>
  );
}
