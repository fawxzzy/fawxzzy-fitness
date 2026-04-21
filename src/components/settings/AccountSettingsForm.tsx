"use client";

import { type FormEvent, useCallback, useMemo, useState, useTransition } from "react";
import { updateAccountEmailAction, type EmailUpdateState } from "@/app/settings/actions";
import { AppButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { readRememberedLoginState, writeRememberedLoginState } from "@/lib/remembered-login";

const INITIAL_EMAIL_STATE: EmailUpdateState = { status: "idle" };

export function AccountSettingsForm({ email, username }: { email: string; username: string }) {
  const [emailState, setEmailState] = useState<EmailUpdateState>(INITIAL_EMAIL_STATE);
  const [emailPending, startEmailTransition] = useTransition();

  const submitEmailUpdate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);

      startEmailTransition(async () => {
        const result = await updateAccountEmailAction(formData);
        setEmailState(result);
        if (result.status === "success") {
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
    [email, startEmailTransition],
  );

  const emailMessageTone = useMemo(() => {
    if (emailState.status === "error") return "text-[rgb(var(--button-destructive-text))]";
    if (emailState.status === "success") return "text-[rgb(var(--accent-green-on))]";
    return "text-[rgb(var(--text-muted)/0.9)]";
  }, [emailState.status]);

  return (
    <form onSubmit={submitEmailUpdate} className={appTokens.settingsBlockStack}>
      <div className={appTokens.settingsFieldStack}>
        <label htmlFor="settings-username" className={cn("block", appTokens.measurementLabel)}>
          Username
        </label>
        <Input
          id="settings-username"
          name="username"
          type="text"
          defaultValue={username}
          autoComplete="username"
          minLength={2}
          maxLength={24}
          placeholder="Set a username"
        />
      </div>
      <div className={appTokens.settingsFieldStack}>
        <label htmlFor="settings-email" className={cn("block", appTokens.measurementLabel)}>
          Email
        </label>
        <Input
          id="settings-email"
          name="email"
          type="email"
          defaultValue={email}
          autoComplete="email"
          required
        />
      </div>
      <div className={appTokens.settingsFieldStack}>
        <AppButton type="submit" variant="secondary" fullWidth loading={emailPending}>
          Save account
        </AppButton>
        <p className={cn(appTokens.settingsBodyText, emailMessageTone)}>
          {emailState.message ?? "Update your username and email from the same place. Email changes may require confirmation."}
        </p>
      </div>
    </form>
  );
}
