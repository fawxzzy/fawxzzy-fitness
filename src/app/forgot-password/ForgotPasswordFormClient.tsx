"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { requestPasswordReset } from "@/app/auth/actions";

const COOLDOWN_SECONDS = 60;
const NEXT_ALLOWED_AT_KEY = "fp_next_allowed_at";

function SubmitButton({ cooldownRemaining }: { cooldownRemaining: number }) {
  const { pending } = useFormStatus();
  const isCoolingDown = cooldownRemaining > 0;
  const isDisabled = pending || isCoolingDown;

  const label = pending ? "Sending..." : isCoolingDown ? `Try again in ${cooldownRemaining}s` : "Send reset link";

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="w-full rounded-md bg-slate-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
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
      return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>;
    }

    if (infoMessage) {
      return (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{infoMessage}</p>
      );
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
    <form action={requestPasswordReset} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="text-sm text-slate-600">Enter your email and we’ll send a reset link.</p>
      <div>
        <label className="mb-1 block text-sm">Email</label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {message}
      <SubmitButton cooldownRemaining={cooldownRemaining} />
      <p className="text-xs text-slate-500">For security, you can request a new link once per minute.</p>
      <p className="text-sm text-slate-600">
        Back to{" "}
        <Link href="/login" className="underline">
          log in
        </Link>
      </p>
    </form>
  );
}
