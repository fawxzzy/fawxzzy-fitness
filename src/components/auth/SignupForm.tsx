"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import { signup } from "@/app/auth/actions";
import { AuthCard, AuthField, AuthFooter, AuthFooterText, AuthForm, AuthMessage, AuthStack } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { writeRememberedLoginState } from "@/lib/remembered-login";

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
      sessionState: "ready",
    });
  }

  return (
    <AuthCard>
      <AuthForm action={signup} onSubmit={handleSubmit}>
        <AuthStack>
          <AuthField label="Username">
            <Input
              type="text"
              name="username"
              minLength={2}
              maxLength={24}
              autoComplete="username"
              placeholder="Choose a username"
            />
          </AuthField>
          <AuthField label="Email">
            <Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
          </AuthField>
          <AuthField label="Password">
            <Input type="password" name="password" minLength={6} required autoComplete="new-password" placeholder="Create a password" />
          </AuthField>
        </AuthStack>

        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

        <PrimaryButton type="submit" fullWidth>
          Sign up
        </PrimaryButton>
      </AuthForm>

      <AuthFooter>
        <AuthFooterText>
          Already have an account?{" "}
          <Link href="/login" className={appTokens.authInlineLink}>
            Log in
          </Link>
        </AuthFooterText>
      </AuthFooter>
    </AuthCard>
  );
}
