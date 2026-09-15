"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { signup } from "@/app/auth/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AUTH_PLAIN_CARD_CHROME_CLASS_NAME, AUTH_PRIMARY_DOCK_BUTTON_CLASS_NAME, AuthCard, AuthDock, AuthFooter, AuthFooterText, AuthForm, AuthFormFields, AuthLegalRow } from "@/components/auth/AuthShell";
import { AUTH_ACCOUNT_INPUT_CLASS_NAME, AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME, AuthAccountField } from "@/components/auth/AuthAccountField";
import { FitContentInput } from "@/components/ui/FitContentInput";
import { appTokens } from "@/components/ui/app/tokens";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { cn } from "@/lib/cn";
import { writeRememberedLoginState } from "@/lib/remembered-login";
import { isUsernameIdentifier, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/username-policy";

const SIGNUP_FORM_ID = "signup-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS = 8;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function SignupForm({
  error,
  info,
}: {
  error?: string;
  info?: string;
}) {
  const copy = AUTH_MODE_COPY["create-account"];
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canCreate = isUsernameIdentifier(username) && EMAIL_PATTERN.test(email.trim().toLowerCase()) && password.length >= 6;

  useToastMessageEffect("error", error, { id: "signup-route-error" });
  useToastMessageEffect("success", info, { id: "signup-route-info" });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const username = String(formData.get("username") ?? "").trim();

    if (!email) {
      return;
    }

    writeRememberedLoginState({
      email,
      displayName: username || undefined,
      sessionState: "reauth-required",
    });
  }

  return (
    <>
      <AuthCard
        aria-label="Fitness account creation"
        data-auth-intent="signup"
        data-auth-surface="credentials"
        className={cn(appTokens.authInteractiveCard, AUTH_PLAIN_CARD_CHROME_CLASS_NAME)}
      >
        <AuthForm id={SIGNUP_FORM_ID} action={signup} onSubmit={handleSubmit}>
          <AuthFormFields>
            <AuthAccountField label="Username">
              <FitContentInput
                type="text"
                name="username"
                required
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                pattern="[A-Za-z0-9._-]{2,15}"
                autoComplete="username"
                fitContent={false}
                minVisibleCharacters={SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS}
                wrapperClassName="w-full"
                className={cn(
                  AUTH_ACCOUNT_INPUT_CLASS_NAME,
                )}
                onChange={(event) => setUsername(event.target.value)}
              />
            </AuthAccountField>
            <AuthAccountField label="Email">
              <FitContentInput
                type="email"
                name="email"
                required
                autoComplete="email"
                fitContent={false}
                minVisibleCharacters={SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS}
                wrapperClassName="w-full"
                className={cn(
                  AUTH_ACCOUNT_INPUT_CLASS_NAME,
                )}
                onChange={(event) => setEmail(event.target.value)}
              />
            </AuthAccountField>
            <AuthAccountField label="Password">
              <PasswordInput
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
                fitContent={false}
                minVisibleCharacters={SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS}
                wrapperClassName="w-full"
                className={cn(
                  AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME,
                )}
                onChange={(event) => setPassword(event.target.value)}
              />
            </AuthAccountField>
          </AuthFormFields>
        </AuthForm>

        <AuthFooter>
          <AuthFooterText className="gap-y-0.5">
            <Link href="/login" className={appTokens.authInlineLink}>
              Log in
            </Link>
          </AuthFooterText>
          <AuthLegalRow />
        </AuthFooter>
      </AuthCard>

      <AuthDock>
        <BottomActionSingle>
          <BottomDockButton
            type="submit"
            form={SIGNUP_FORM_ID}
            intent="positive"
            disabled={!canCreate}
            data-auth-primary-action="true"
            className={AUTH_PRIMARY_DOCK_BUTTON_CLASS_NAME}
          >
            Create account
          </BottomDockButton>
        </BottomActionSingle>
      </AuthDock>
    </>
  );
}
