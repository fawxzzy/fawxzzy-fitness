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
  const error = searchParams?.error;
  const isRecoveryAttempt = searchParams?.recovery === "1";

  if (isRecoveryAttempt) {
    return (
      <AuthShell>
        <AuthCard className={appTokens.authInteractiveCard}>
          <AuthIntro eyebrow="" title="Reset password" subtitle="" />
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
      <AuthShell>
        <ToastFeedbackBridge error={error ?? "Reset link expired."} />
        <AuthCard className={appTokens.authInteractiveCard}>
          <AuthIntro eyebrow="" title="Reset password" subtitle="" />
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
    <AuthShell>
      <ResetPasswordForm error={error} />
    </AuthShell>
  );
}
