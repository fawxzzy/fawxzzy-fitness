"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import {
  AuthCard,
  AuthDock,
  AuthField,
  AuthFooter,
  AuthFooterSeparator,
  AuthFooterText,
  AuthForm,
  AuthIntro,
  AuthMessage,
  AuthStack,
} from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";

const RESET_PASSWORD_FORM_ID = "reset-password-form";

export function ResetPasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSave = password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSave) {
      event.preventDefault();
      return;
    }

    setIsSubmitting(true);
  }

  return (
    <>
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthIntro eyebrow="" title="" subtitle="" />
        <AuthForm id={RESET_PASSWORD_FORM_ID} action={updatePasswordAction} onSubmit={handleSubmit}>
          <AuthStack>
            <AuthField label="New password" hideLabel>
              <Input
                type="password"
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </AuthField>
            <AuthField label="Confirm new password" hideLabel>
              <Input
                type="password"
                name="confirmPassword"
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="confirm password"
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </AuthField>
          </AuthStack>
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        </AuthForm>
        <AuthFooter>
          <AuthFooterText>
            <Link href="/signup" className={appTokens.authInlineLink}>
              Create account
            </Link>
            <AuthFooterSeparator />
            <Link href="/login" className={appTokens.authInlineLink}>
              Log In
            </Link>
          </AuthFooterText>
        </AuthFooter>
      </AuthCard>

      <AuthDock>
        <BottomActionSingle>
          <BottomDockButton
            type="submit"
            form={RESET_PASSWORD_FORM_ID}
            intent="positive"
            disabled={!canSave || isSubmitting}
            loading={isSubmitting}
            loadingLabel="Saving..."
          >
            Save
          </BottomDockButton>
        </BottomActionSingle>
      </AuthDock>
    </>
  );
}
