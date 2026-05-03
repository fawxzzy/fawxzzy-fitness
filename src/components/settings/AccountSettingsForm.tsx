"use client";

import { type FormEvent, useCallback, useMemo, useState, useTransition } from "react";
import { updateAccountEmailAction, type EmailUpdateState } from "@/app/settings/actions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { AppAmbientBackdrop } from "@/components/layout/AppAmbientBackdrop";
import { SignOutButton } from "@/components/SignOutButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { cn } from "@/lib/cn";
import { readRememberedLoginState, writeRememberedLoginState } from "@/lib/remembered-login";

const INITIAL_EMAIL_STATE: EmailUpdateState = { status: "idle" };
const ACCOUNT_SETTINGS_FORM_ID = "account-settings-form";

export function AccountSettingsForm({ email, username }: { email: string; username: string }) {
  const [emailState, setEmailState] = useState<EmailUpdateState>(INITIAL_EMAIL_STATE);
  const [emailPending, startEmailTransition] = useTransition();
  const rememberedUsername = useMemo(() => {
    const rememberedDisplayName = readRememberedLoginState()?.displayName;
    return typeof rememberedDisplayName === "string" ? rememberedDisplayName.trim() : "";
  }, []);
  const initialUsername = useMemo(() => {
    const normalizedUsername = username.trim();
    return normalizedUsername || rememberedUsername;
  }, [rememberedUsername, username]);
  const [usernameValue, setUsernameValue] = useState(initialUsername);
  const [emailValue, setEmailValue] = useState(email);
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [savedEmail, setSavedEmail] = useState(email);
  const isDirty = usernameValue.trim() !== savedUsername.trim() || emailValue.trim() !== savedEmail.trim();

  const submitEmailUpdate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);

      startEmailTransition(async () => {
        const result = await updateAccountEmailAction(formData);
        setEmailState(result);
        if (result.status === "success") {
          setSavedUsername(usernameValue.trim());
          setSavedEmail(emailValue.trim());
          const rememberedLogin = readRememberedLoginState();
          if (rememberedLogin?.email && rememberedLogin.email === email.trim().toLowerCase()) {
            writeRememberedLoginState({
              email: rememberedLogin.email,
              displayName: result.updatedDisplayName ?? rememberedLogin.displayName,
              sessionState: rememberedLogin.sessionState,
            });
          }
        }
      });
    },
    [email, emailValue, startEmailTransition, usernameValue],
  );

  const emailMessageTone = useMemo(() => {
    if (emailState.status === "error") return appTokens.settingsStatusError;
    if (emailState.status === "success") return appTokens.settingsStatusSuccess;
    return appTokens.settingsStatusMuted;
  }, [emailState.status]);

  return (
    <>
      <PublishBottomActions>
        <BottomActionSplit
          secondary={<SignOutButton />}
          primary={(
            <BottomDockButton
              type="submit"
              form={ACCOUNT_SETTINGS_FORM_ID}
              intent="positive"
              loading={emailPending}
              disabled={!isDirty}
            >
              Save
            </BottomDockButton>
          )}
        />
      </PublishBottomActions>

      <form id={ACCOUNT_SETTINGS_FORM_ID} onSubmit={submitEmailUpdate} className="space-y-3 pt-2">
        <div className="relative -mx-5 overflow-hidden rounded-[var(--radius-lg)] border border-transparent bg-[rgb(var(--surface-1-rgb)/0.22)] shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]">
          <div className="absolute inset-0 opacity-72 [mask-image:linear-gradient(180deg,black,black_82%,transparent)]">
            <AppAmbientBackdrop preset="today" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--surface-1-rgb)/0.18),rgb(var(--surface-1-rgb)/0.46))]" />
          <div className="relative space-y-3 p-4 sm:p-5">
            <div className={appTokens.settingsFieldStack}>
              <LabeledEditorField label="Username">
                <Input
                  id="settings-username"
                  name="username"
                  type="text"
                  value={usernameValue}
                  onChange={(event) => setUsernameValue(event.target.value)}
                  autoComplete="username"
                  minLength={2}
                  maxLength={15}
                  placeholder="Set a username"
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                  )}
                />
              </LabeledEditorField>
            </div>
            <div className={appTokens.settingsFieldStack}>
              <LabeledEditorField label="Email">
                <Input
                  id="settings-email"
                  name="email"
                  type="email"
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  autoComplete="email"
                  required
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                  )}
                />
              </LabeledEditorField>
            </div>
            <div className={appTokens.settingsFieldStack}>
              {emailState.message ? <p className={cn(appTokens.settingsBodyText, emailMessageTone)}>{emailState.message}</p> : null}
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
