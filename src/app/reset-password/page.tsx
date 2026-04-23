import { RecoverySessionBridge } from "@/app/reset-password/RecoverySessionBridge";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { AuthCard, AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
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
            <p className="pt-2 text-center text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">Reset link expired.</p>
          )}
        </AuthCard>
        {!isRecoveryAttempt ? (
          <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
            <BottomActionSingle>
              <BottomDockLink href="/login" intent="positive">
                Log In
              </BottomDockLink>
            </BottomActionSingle>
          </div>
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
