"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/reset-password/actions";
import {
  AuthCard,
  AuthDock,
  AuthFooter,
  AuthFooterSeparator,
  AuthFooterText,
  AuthForm,
  AuthFormFields,
  AuthIntro,
} from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
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
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthIntro eyebrow="" title="" subtitle="" />
        <AuthForm id={RESET_PASSWORD_FORM_ID} action={updatePasswordAction} onSubmit={handleSubmit}>
          <AuthFormFields>
            <LabeledEditorField label="New password">
              <PasswordInput
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
                onChange={(event) => setPassword(event.target.value)}
              />
            </LabeledEditorField>
            <LabeledEditorField label="Confirm new password">
              <PasswordInput
                name="confirmPassword"
                minLength={6}
                required
                autoComplete="new-password"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </LabeledEditorField>
          </AuthFormFields>
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
