"use client";

import { type ChangeEvent, type FormEvent, useState, useTransition } from "react";
import { changePasswordAction, type PasswordUpdateState } from "@/app/settings/actions";
import { AppButton } from "@/components/ui/AppButton";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import {
  CHANGE_PASSWORD_COPY,
  NEW_PASSWORD_MINIMUM,
  NEW_PASSWORD_REQUIREMENT,
  validateChangePasswordInput,
} from "@/lib/password-policy";

const PASSWORD_FORM_ID = "account-password-form";
const PASSWORD_FIELD_CLASS_NAME = cn(
  labeledEditorFieldControlClassName,
  "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
);

// Change password while signed in (FF-ACCOUNT-003). Lives under the Account details form and keeps its own submit
// button: the Account dock is already taken by Sign out and Save.
export function AccountPasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [result, setResult] = useState<PasswordUpdateState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const input = validateChangePasswordInput({ current: currentPassword, next: newPassword, confirmation: confirmPassword });
  const showMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const messageTone =
    result.status === "error" ? appTokens.settingsStatusError : result.status === "success" ? appTokens.settingsStatusSuccess : appTokens.settingsStatusMuted;

  // Typing again clears the previous outcome message.
  function edit(setValue: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      if (result.status !== "idle") {
        setResult({ status: "idle" });
      }
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.ok || pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const next = await changePasswordAction(formData);
      setResult(next);
      if (next.status === "success") {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <form
      id={PASSWORD_FORM_ID}
      onSubmit={handleSubmit}
      className="space-y-3 pt-2"
      aria-labelledby="account-password-heading"
      data-testid="account-password-form"
    >
      <div className="relative -mx-5 overflow-hidden rounded-[var(--radius-lg)] border border-transparent bg-transparent shadow-none">
        <div className="relative space-y-3 p-4 sm:p-5">
          <p id="account-password-heading" className={cn(appTokens.settingsSectionTitle, "text-center")}>Change password</p>
          {/* Lets password managers file the new password under the right account. */}
          <input type="text" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
          <div className={appTokens.settingsFieldStack}>
            <LabeledEditorField label="Current password">
              <PasswordInput
                id="account-current-password"
                name="currentPassword"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={edit(setCurrentPassword)}
                className={PASSWORD_FIELD_CLASS_NAME}
              />
            </LabeledEditorField>
          </div>
          <div className={appTokens.settingsFieldStack}>
            <LabeledEditorField label="New password">
              <PasswordInput
                id="account-new-password"
                name="newPassword"
                autoComplete="new-password"
                minLength={NEW_PASSWORD_MINIMUM}
                required
                value={newPassword}
                onChange={edit(setNewPassword)}
                className={PASSWORD_FIELD_CLASS_NAME}
              />
            </LabeledEditorField>
          </div>
          <div className={appTokens.settingsFieldStack}>
            <LabeledEditorField label="Confirm new password">
              <PasswordInput
                id="account-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={NEW_PASSWORD_MINIMUM}
                required
                value={confirmPassword}
                onChange={edit(setConfirmPassword)}
                className={PASSWORD_FIELD_CLASS_NAME}
              />
            </LabeledEditorField>
          </div>
          <div className={appTokens.settingsFieldStack} aria-live="polite">
            {showMismatch ? (
              <p className={cn(appTokens.settingsBodyText, appTokens.settingsStatusError)}>{CHANGE_PASSWORD_COPY.confirmation_mismatch}</p>
            ) : result.message ? (
              <p className={cn(appTokens.settingsBodyText, messageTone)}>{result.message}</p>
            ) : (
              <p className={cn(appTokens.settingsBodyText, appTokens.settingsStatusMuted)}>{NEW_PASSWORD_REQUIREMENT}</p>
            )}
          </div>
          <AppButton type="submit" variant="primary" fullWidth loading={pending} disabled={!input.ok}>
            Update password
          </AppButton>
        </div>
      </div>
    </form>
  );
}
