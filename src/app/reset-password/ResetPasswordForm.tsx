"use client";

import { type FormEvent, useState } from "react";
import { updatePasswordAction } from "@/app/reset-password/actions";
import { AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME, AuthAccountField } from "@/components/auth/AuthAccountField";
import {
  AuthBody,
  AuthDockButton,
  AuthForm,
  AuthFormFields,
  AuthHead,
  AuthLegalRow,
  AuthNoticeSlot,
  AuthShell,
} from "@/components/auth/AuthShell";
import {
  authNotice,
  resetPasswordErrorNoticeId,
  type AuthMessageId,
  type AuthNotice,
} from "@/components/auth/authMessages";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { isValidNewPassword, NEW_PASSWORD_MINIMUM } from "@/lib/password-policy";

const RESET_PASSWORD_FORM_ID = "reset-password-form";
export const NEW_PASSWORD_LEAD = `Choose a password of at least ${NEW_PASSWORD_MINIMUM} characters.`;

type PasswordField = "password" | "confirm";

const NOTICE_FIELD: Partial<Record<AuthMessageId, PasswordField | "both">> = {
  "signup.pwshort": "password",
  "signup.pwweak": "password",
  "reset.same": "password",
  "reset.mismatch": "both",
};

/**
 * New password (Auth Surface v2), reached from a valid reset link. `error` is the allow-listed copy the page resolved
 * from `?error=<code>`; it shows as its matrix notice and marks the field it is about.
 */
export function ResetPasswordForm({ error, previewNotice = null }: { error?: string; previewNotice?: AuthMessageId | null }) {
  const initialId = previewNotice ?? resetPasswordErrorNoticeId(error);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(initialId ? authNotice(initialId) : null);
  const [invalid, setInvalid] = useState<PasswordField | "both" | null>(initialId ? NOTICE_FIELD[initialId] ?? null : null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }
    if (!isValidNewPassword(password)) {
      event.preventDefault();
      setInvalid("password");
      setNotice(authNotice("signup.pwshort"));
      return;
    }
    if (password !== confirmPassword) {
      event.preventDefault();
      setInvalid("both");
      setNotice(authNotice("reset.mismatch"));
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      event.preventDefault();
      setNotice(authNotice("signin.offline"));
      return;
    }
    setInvalid(null);
    setNotice(null);
    setIsSubmitting(true);
  }

  return (
    <AuthShell>
      <AuthHead title="New password" lead={NEW_PASSWORD_LEAD} />
      <AuthBody aria-label="Fitness password update" data-auth-intent="reset-password" data-auth-surface="recovery">
        <AuthForm id={RESET_PASSWORD_FORM_ID} action={updatePasswordAction} onSubmit={handleSubmit} noValidate>
          <AuthFormFields>
            <AuthAccountField label="New password" htmlFor="reset-new-password" invalid={invalid === "password" || invalid === "both"}>
              <PasswordInput
                id="reset-new-password"
                name="password"
                minLength={NEW_PASSWORD_MINIMUM}
                autoComplete="new-password"
                readOnly={isSubmitting}
                wrapperClassName="w-full"
                className={AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setInvalid(null);
                }}
              />
            </AuthAccountField>
            <AuthAccountField label="Confirm password" htmlFor="reset-confirm-password" invalid={invalid === "confirm" || invalid === "both"}>
              <PasswordInput
                id="reset-confirm-password"
                name="confirmPassword"
                minLength={NEW_PASSWORD_MINIMUM}
                autoComplete="new-password"
                readOnly={isSubmitting}
                wrapperClassName="w-full"
                className={AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setInvalid(null);
                }}
              />
            </AuthAccountField>
          </AuthFormFields>
          <AuthNoticeSlot notice={notice} />
        </AuthForm>
      </AuthBody>
      <AuthLegalRow />
      <AuthDockButton
        type="submit"
        form={RESET_PASSWORD_FORM_ID}
        busy={isSubmitting}
        busyLabel="Saving…"
        disabled={!password || !confirmPassword}
      >
        Save password
      </AuthDockButton>
    </AuthShell>
  );
}
