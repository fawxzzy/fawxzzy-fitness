import { RecoverySessionBridge } from "@/app/reset-password/RecoverySessionBridge";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { AuthCard, AuthDock, AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
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

  if (!data.user) {
    return (
      <AuthShell>
        <AuthCard className={appTokens.authInteractiveCard}>
          <AuthIntro eyebrow="" title="Reset password" subtitle="" />
          {isRecoveryAttempt ? (
            <RecoverySessionBridge initialError={error} />
          ) : (
            <p className={cn("pt-2 text-center", appTokens.authSubtitleText)}>Reset link expired.</p>
          )}
        </AuthCard>
        {!isRecoveryAttempt ? (
          <AuthDock>
            <BottomActionSingle>
              <BottomDockLink href="/login" intent="positive">
                Log In
              </BottomDockLink>
            </BottomActionSingle>
          </AuthDock>
        ) : null}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <ResetPasswordForm error={error} />
    </AuthShell>
  );
}
