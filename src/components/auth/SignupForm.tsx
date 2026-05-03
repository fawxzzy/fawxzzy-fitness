"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { signup } from "@/app/auth/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthDock, AuthFooter, AuthFooterText, AuthForm, AuthFormFields, AuthIntro } from "@/components/auth/AuthShell";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { cn } from "@/lib/cn";
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
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthIntro eyebrow="" title={copy.title} subtitle={copy.subtitle} />
        <AuthForm id={SIGNUP_FORM_ID} action={signup} onSubmit={handleSubmit}>
          <AuthFormFields>
            <LabeledEditorField label="Username" className="border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none">
              <Input
                type="text"
                name="username"
                minLength={2}
                maxLength={15}
                autoComplete="username"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
              />
            </LabeledEditorField>
            <LabeledEditorField label="Email" className="border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none">
              <Input
                type="email"
                name="email"
                required
                autoComplete="email"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
                onChange={(event) => setEmail(event.target.value)}
              />
            </LabeledEditorField>
            <LabeledEditorField label="Password" className="border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none">
              <Input
                type="password"
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
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
