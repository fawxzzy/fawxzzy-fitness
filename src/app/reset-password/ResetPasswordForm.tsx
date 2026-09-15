"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import {
  AUTH_PLAIN_CARD_CHROME_CLASS_NAME,
  AuthCard,
  AuthCenteredFooterRow,
  AuthDock,
  AuthFooter,
  AuthForm,
  AuthFormFields,
  AuthLegalRow,
} from "@/components/auth/AuthShell";
import { AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME, AuthAccountField } from "@/components/auth/AuthAccountField";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { cn } from "@/lib/cn";

const RESET_PASSWORD_FORM_ID = "reset-password-form";

export function ResetPasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSave = password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;

  useToastMessageEffect("error", error, { id: "reset-password-error" });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSave) {
      event.preventDefault();
      return;
    }

    setIsSubmitting(true);
  }

  return (
    <>
      <AuthCard
        aria-label="Fitness password update"
        data-auth-surface="recovery"
        className={cn(appTokens.authInteractiveCard, AUTH_PLAIN_CARD_CHROME_CLASS_NAME)}
      >
        <AuthForm id={RESET_PASSWORD_FORM_ID} action={updatePasswordAction} onSubmit={handleSubmit}>
          <AuthFormFields>
            <AuthAccountField label="New password">
              <PasswordInput
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
                fitContent={false}
                minVisibleCharacters={12}
                wrapperClassName="w-full"
                className={cn(
                  AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME,
                )}
                onChange={(event) => setPassword(event.target.value)}
              />
            </AuthAccountField>
            <AuthAccountField label="Confirm new password">
              <PasswordInput
                name="confirmPassword"
                minLength={6}
                required
                autoComplete="new-password"
                fitContent={false}
                minVisibleCharacters={20}
                wrapperClassName="w-full"
                className={cn(
                  AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME,
                )}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </AuthAccountField>
          </AuthFormFields>
        </AuthForm>
        <AuthFooter>
          <AuthCenteredFooterRow
            leading={<Link href="/signup" className={appTokens.authInlineLink}>
              Create account
            </Link>}
            trailing={<Link href="/login" className={appTokens.authInlineLink}>
              Log In
            </Link>}
          />
          <AuthLegalRow />
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
