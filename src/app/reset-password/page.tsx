import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import { RecoverySessionBridge } from "@/app/reset-password/RecoverySessionBridge";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthActionBar, AuthCard, AuthField, AuthFooter, AuthForm, AuthIntro, AuthMessage, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { appTokens } from "@/components/ui/app/tokens";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { Input } from "@/components/ui/Input";
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
  const copy = AUTH_MODE_COPY["reset-password"];

  if (!data.user) {
    return (
      <AuthShell>
        <AuthCard className={appTokens.authInteractiveCard}>
          <AuthIntro
            eyebrow={copy.eyebrow}
            title="Set new password"
            subtitle="Use your recovery link to choose a new password."
          />
          {isRecoveryAttempt ? (
            <RecoverySessionBridge initialError={error} />
          ) : (
            <AuthStack>
              <AuthMessage tone="error">Reset link expired. Request a new password reset.</AuthMessage>
              <AuthActionBar>
                <Link
                  href="/forgot-password"
                  data-action-chrome-intent="positive"
                  className={getAppButtonClassName({
                    variant: "primary",
                    fullWidth: true,
                    className: cn(ACTION_CHROME_SEGMENTED_CLASS_NAME, appTokens.authActionButton),
                  })}
                >
                  Request new reset link
                </Link>
              </AuthActionBar>
            </AuthStack>
          )}
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthIntro eyebrow={copy.eyebrow} title="Set new password" subtitle="Choose and confirm a new password for your account." />
        <AuthForm action={updatePasswordAction}>
          <AuthStack>
            <AuthField label="New password">
              <Input type="password" name="password" minLength={6} required autoComplete="new-password" placeholder="Enter new password" />
            </AuthField>
            <AuthField label="Confirm new password">
              <Input type="password" name="confirmPassword" minLength={6} required autoComplete="new-password" placeholder="Confirm new password" />
            </AuthField>
          </AuthStack>
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          <AuthActionBar>
            <PrimaryButton
              type="submit"
              fullWidth
              data-action-chrome-segmented="true"
              className={appTokens.authActionButton}
            >
              Save new password
            </PrimaryButton>
          </AuthActionBar>
        </AuthForm>
        <AuthFooter>
          <p className={appTokens.authHelperTextMuted}>{copy.helper}</p>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
