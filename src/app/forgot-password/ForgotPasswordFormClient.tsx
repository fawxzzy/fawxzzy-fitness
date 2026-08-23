"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import {
  AUTH_PLAIN_CARD_CHROME_CLASS_NAME,
  AuthCard,
  AuthDock,
  AuthFooter,
  AuthFooterSeparator,
  AuthFooterText,
  AuthForm,
  AuthFormFields,
  AuthIntro,
  AuthShell,
} from "@/components/auth/AuthShell";
import { LegalInlineLinks } from "@/components/legal/LegalInlineLinks";
import { appTokens } from "@/components/ui/app/tokens";
import { FitContentInput } from "@/components/ui/FitContentInput";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { cn } from "@/lib/cn";
import { isUsernameIdentifier } from "@/lib/username-policy";

const COOLDOWN_SECONDS = 60;
const NEXT_ALLOWED_AT_KEY = "fp_next_allowed_at";
const RESET_FORM_ID = "reset-password-request-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_FIELD_WIDTH_CLASS_NAME = "w-[15rem] max-w-full";

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
  const copy = AUTH_MODE_COPY["reset-password"];
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  useToastMessageEffect("error", errorMessage, { id: "forgot-password-error" });
  useToastMessageEffect("success", infoMessage, { id: "forgot-password-info" });

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
    const identifier = String(formData.get("email") ?? "").trim();

    if ((!EMAIL_PATTERN.test(identifier.toLowerCase()) && !isUsernameIdentifier(identifier)) || cooldownRemaining > 0) {
      event.preventDefault();
      return;
    }

    setIsSubmitting(true);
  }

  const isCoolingDown = cooldownRemaining > 0;
  const identifierValue = email.trim();
  const emailValid = EMAIL_PATTERN.test(identifierValue.toLowerCase()) || isUsernameIdentifier(identifierValue);
  const submitLabel = isCoolingDown ? `Try again in ${cooldownRemaining}s` : "Send reset link";

  return (
    <AuthShell header={<AuthIntro eyebrow="" title={copy.title} subtitle="" />}>
      <AuthCard className={cn(appTokens.authInteractiveCard, AUTH_PLAIN_CARD_CHROME_CLASS_NAME)}>
        <AuthForm id={RESET_FORM_ID} action={requestPasswordReset} onSubmit={handleSubmit}>
          <AuthFormFields>
            <LabeledEditorField label="Email or username" className={cn("mx-auto border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none", AUTH_FIELD_WIDTH_CLASS_NAME)}>
              <FitContentInput
                type="text"
                name="email"
                required
                autoComplete="username"
                fitContent={false}
                minVisibleCharacters={17}
                wrapperClassName="w-full"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "auth-input-plain h-12 w-full min-w-0 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
                onChange={(event) => setEmail(event.target.value)}
              />
            </LabeledEditorField>
          </AuthFormFields>
        </AuthForm>

        <AuthFooter>
          <AuthFooterText>
            <Link href="/signup" className={appTokens.authInlineLink}>
              Create account
            </Link>
            <AuthFooterSeparator />
            <Link href="/login" className={appTokens.authInlineLink}>
              Log In
            </Link>
            <LegalInlineLinks className="basis-full" linkClassName={appTokens.authInlineLink} />
          </AuthFooterText>
        </AuthFooter>
      </AuthCard>

      <AuthDock>
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
      </AuthDock>
    </AuthShell>
  );
}
