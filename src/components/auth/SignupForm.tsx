"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { signup } from "@/app/auth/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthField, AuthFooter, AuthFooterText, AuthForm, AuthIntro, AuthMessage, AuthStack } from "@/components/auth/AuthShell";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { writeRememberedLoginState } from "@/lib/remembered-login";

const SIGNUP_FORM_ID = "signup-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthIntro eyebrow="" title={copy.title} subtitle={copy.subtitle} />
        <AuthForm id={SIGNUP_FORM_ID} action={signup} onSubmit={handleSubmit}>
          <AuthStack>
            <AuthField label="Username" hideLabel>
              <Input
                type="text"
                name="username"
                minLength={2}
                maxLength={24}
                autoComplete="username"
                placeholder="username (optional)"
              />
            </AuthField>
            <AuthField label="Email" hideLabel>
              <Input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </AuthField>
            <AuthField label="Password" hideLabel>
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
          </AuthStack>

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}
        </AuthForm>

        <AuthFooter className="pt-7">
          <AuthFooterText>
            <Link href="/login" className={appTokens.authInlineLink}>
              Log In
            </Link>
          </AuthFooterText>
        </AuthFooter>
      </AuthCard>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <BottomActionSingle>
          <BottomDockButton
            type="submit"
            form={SIGNUP_FORM_ID}
            intent="positive"
            disabled={!canCreate}
          >
            Create
          </BottomDockButton>
        </BottomActionSingle>
      </div>
    </>
  );
}
