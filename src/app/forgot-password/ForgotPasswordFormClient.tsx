"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AuthCard, AuthField, AuthFooter, AuthFooterText, AuthForm, AuthIntro, AuthMessage, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";

const COOLDOWN_SECONDS = 60;
const NEXT_ALLOWED_AT_KEY = "fp_next_allowed_at";
const RESET_FORM_ID = "reset-password-request-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ForgotPasswordFormClientProps = {
  errorMessage: string | null;
  infoMessage: string | null;
  shouldStartCooldown: boolean;
};

export default function ForgotPasswordFormClient({
  errorMessage,
  infoMessage,
  shouldStartCooldown,
}: ForgotPasswordFormClientProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const message = useMemo(() => {
    if (errorMessage) {
      return <AuthMessage tone="error">{errorMessage}</AuthMessage>;
    }

    if (infoMessage) {
      return <AuthMessage tone="success">{infoMessage}</AuthMessage>;
    }

    return null;
  }, [errorMessage, infoMessage]);

  useEffect(() => {
    const now = Date.now();
    const stored = Number(window.localStorage.getItem(NEXT_ALLOWED_AT_KEY) ?? "0");
    if (Number.isFinite(stored) && stored > now) {
      setCooldownRemaining(Math.ceil((stored - now) / 1000));
    }

    if (shouldStartCooldown && stored <= now) {
      const nextAllowedAt = now + COOLDOWN_SECONDS * 1000;
      window.localStorage.setItem(NEXT_ALLOWED_AT_KEY, String(nextAllowedAt));
      setCooldownRemaining(COOLDOWN_SECONDS);
    }
  }, [shouldStartCooldown]);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextAllowedAt = Number(window.localStorage.getItem(NEXT_ALLOWED_AT_KEY) ?? "0");
      const seconds = Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000));
      setCooldownRemaining(seconds);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!EMAIL_PATTERN.test(email.toLowerCase()) || cooldownRemaining > 0) {
      event.preventDefault();
      return;
    }

    setIsSubmitting(true);
  }

  const isCoolingDown = cooldownRemaining > 0;
  const emailValid = EMAIL_PATTERN.test(email.trim().toLowerCase());
  const submitLabel = isCoolingDown ? `Try again in ${cooldownRemaining}s` : "Send reset link";

  return (
    <AuthShell>
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthIntro eyebrow="" title="" subtitle="" />
        <AuthForm id={RESET_FORM_ID} action={requestPasswordReset} onSubmit={handleSubmit}>
          <AuthStack>
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
          </AuthStack>
          {message}
        </AuthForm>
        <AuthFooter className="pt-7">
          <AuthFooterText>
            <Link href="/signup" className={appTokens.authInlineLink}>
              Create account
            </Link>
            <span aria-hidden="true" className="px-2 text-[rgb(var(--text-muted)/0.72)]">|</span>
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
            form={RESET_FORM_ID}
            intent="positive"
            disabled={!emailValid || isSubmitting || isCoolingDown}
            loading={isSubmitting}
            loadingLabel="Sending..."
          >
            {submitLabel}
          </BottomDockButton>
        </BottomActionSingle>
      </div>
    </AuthShell>
  );
}
