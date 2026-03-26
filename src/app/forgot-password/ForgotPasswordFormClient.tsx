"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthCard, AuthField, AuthFooter, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { BackButton } from "@/components/ui/BackButton";
import { PrimaryButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";

const COOLDOWN_SECONDS = 60;
const NEXT_ALLOWED_AT_KEY = "fp_next_allowed_at";

function SubmitButton({ cooldownRemaining }: { cooldownRemaining: number }) {
  const { pending } = useFormStatus();
  const isCoolingDown = cooldownRemaining > 0;
  const isDisabled = pending || isCoolingDown;

  const label = pending ? "Sending..." : isCoolingDown ? `Try again in ${cooldownRemaining}s` : "Send reset link";

  return (
    <PrimaryButton type="submit" disabled={isDisabled} fullWidth>
      {label}
    </PrimaryButton>
  );
}

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

  return (
    <AuthShell>
      <AuthIntro
        eyebrow="Password recovery"
        title="Reset your password"
        subtitle="Recovery still works in the browser, so you can request a new link without being forced into an install-only dead end."
      />

      <AuthCard>
        <form action={requestPasswordReset} className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-300">Enter your email and we’ll send a reset link.</p>
            <AuthField label="Email">
              <Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
            </AuthField>
          </div>
          {message}
          <SubmitButton cooldownRemaining={cooldownRemaining} />
          <p className="text-xs leading-5 text-slate-500">For security, you can request a new link once per minute.</p>
        </form>

        <AuthFooter>
          <BackButton href="/login" label="Back to log in" className="ml-auto" />
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
