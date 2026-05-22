"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { signup } from "@/app/auth/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AUTH_PLAIN_CARD_CHROME_CLASS_NAME, AuthCard, AuthDock, AuthFooter, AuthFooterText, AuthForm, AuthFormFields } from "@/components/auth/AuthShell";
import { FitContentInput } from "@/components/ui/FitContentInput";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { appTokens } from "@/components/ui/app/tokens";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { cn } from "@/lib/cn";
import { writeRememberedLoginState } from "@/lib/remembered-login";

const SIGNUP_FORM_ID = "signup-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS = 8;
const AUTH_FIELD_WIDTH_CLASS_NAME = "w-[15rem] max-w-full";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canCreate = EMAIL_PATTERN.test(email.trim().toLowerCase()) && password.length >= 6;

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
      <AuthCard className={cn(appTokens.authInteractiveCard, AUTH_PLAIN_CARD_CHROME_CLASS_NAME)}>
        <AuthForm id={SIGNUP_FORM_ID} action={signup} onSubmit={handleSubmit}>
          <AuthFormFields>
            <LabeledEditorField label="Username" className={cn("mx-auto border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none", AUTH_FIELD_WIDTH_CLASS_NAME)}>
              <FitContentInput
                type="text"
                name="username"
                minLength={2}
                maxLength={15}
                autoComplete="username"
                fitContent={false}
                minVisibleCharacters={SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS}
                wrapperClassName="w-full"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 w-full min-w-0 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
              />
            </LabeledEditorField>
            <LabeledEditorField label="Email" className={cn("mx-auto border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none", AUTH_FIELD_WIDTH_CLASS_NAME)}>
              <FitContentInput
                type="email"
                name="email"
                required
                autoComplete="email"
                fitContent={false}
                minVisibleCharacters={SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS}
                wrapperClassName="w-full"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 w-full min-w-0 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
                onChange={(event) => setEmail(event.target.value)}
              />
            </LabeledEditorField>
            <LabeledEditorField label="Password" className={cn("mx-auto border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none", AUTH_FIELD_WIDTH_CLASS_NAME)}>
              <PasswordInput
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
                fitContent={false}
                minVisibleCharacters={SIGNUP_FIELD_MIN_VISIBLE_CHARACTERS}
                wrapperClassName="w-full"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 w-full min-w-0 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
                onChange={(event) => setPassword(event.target.value)}
              />
            </LabeledEditorField>
          </AuthFormFields>
        </AuthForm>

        <AuthFooter>
          <AuthFooterText>
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
            form={SIGNUP_FORM_ID}
            intent="positive"
            disabled={!canCreate}
          >
            Create account
          </BottomDockButton>
        </BottomActionSingle>
      </AuthDock>
    </>
  );
}
