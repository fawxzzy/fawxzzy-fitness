"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { login } from "@/app/auth/actions";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthField, AuthFooter, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const REMEMBERED_LOGIN_KEY = "fawxzzy:remembered-login";
const EMAIL_INPUT_ID = "login-email";
const PASSWORD_INPUT_ID = "login-password";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function readRememberedEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw) as { email?: string } | string;
    const candidate = typeof parsed === "string" ? parsed : parsed.email ?? "";
    return normalizeEmail(candidate);
  } catch {
    return "";
  }
}

function writeRememberedEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({ email }));
  } catch {}
}

function clearRememberedEmail() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {}
}

function toTitleCaseSegment(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getRememberedIdentity(email: string) {
  const localPart = normalizeEmail(email).split("@")[0] ?? "";
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  const primarySegment = segments[0] ?? localPart;

  return {
    firstName: toTitleCaseSegment(primarySegment) || "Athlete",
  };
}

export function LoginScreen({ error, info }: { error?: string; info?: string }) {
  const copy = AUTH_MODE_COPY["password-login"];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentialStep, setShowCredentialStep] = useState(false);

  useEffect(() => {
    const storedEmail = readRememberedEmail();

    if (storedEmail) {
      setRememberedEmail(storedEmail);
      setEmail(storedEmail);
      setFormSeed((current) => current + 1);
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const syncFormValues = () => {
      const emailInput = document.getElementById(EMAIL_INPUT_ID) as HTMLInputElement | null;
      const passwordInput = document.getElementById(PASSWORD_INPUT_ID) as HTMLInputElement | null;

      setEmail(emailInput?.value ?? "");
      setPassword(passwordInput?.value ?? "");
    };

    const frameId = window.requestAnimationFrame(syncFormValues);
    const timeoutIds = [160, 520, 1100].map((delay) => window.setTimeout(syncFormValues, delay));

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [formSeed]);

  const normalizedEmail = normalizeEmail(email);
  const emailValid = EMAIL_PATTERN.test(normalizedEmail);
  const passwordValid = password.length >= 6;
  const formReady = emailValid && passwordValid;
  const rememberedIdentity = rememberedEmail ? getRememberedIdentity(rememberedEmail) : null;
  const hasRememberedAccount = hasHydrated && Boolean(rememberedEmail) && Boolean(rememberedIdentity);
  const showRememberedIdentity =
    hasRememberedAccount
    && !showCredentialStep
    && (normalizedEmail === "" || normalizedEmail === normalizeEmail(rememberedEmail ?? ""));
  const showRememberedAccountCard = showRememberedIdentity && Boolean(rememberedEmail) && Boolean(rememberedIdentity);
  const showManualAuth = !showRememberedAccountCard;

  const helperText = showRememberedAccountCard
    ? (formReady ? PASSWORD_LOGIN_UI_COPY.helper.ready : PASSWORD_LOGIN_UI_COPY.helper.remembered)
    : formReady
      ? PASSWORD_LOGIN_UI_COPY.helper.ready
      : emailValid
        ? PASSWORD_LOGIN_UI_COPY.helper.emailValid
        : PASSWORD_LOGIN_UI_COPY.helper.default;

  const headline = showRememberedIdentity && rememberedIdentity
    ? `${copy.title}, ${rememberedIdentity.firstName}`
    : copy.title;

  const ctaLabel = isSubmitting
    ? PASSWORD_LOGIN_UI_COPY.cta.pending
    : showRememberedAccountCard
      ? PASSWORD_LOGIN_UI_COPY.cta.ready
      : formReady
        ? PASSWORD_LOGIN_UI_COPY.cta.ready
        : PASSWORD_LOGIN_UI_COPY.cta.idle;

  function handleSwitchAccount() {
    clearRememberedEmail();
    setRememberedEmail(null);
    setEmail("");
    setPassword("");
    setIsSubmitting(false);
    setShowCredentialStep(false);
    setFormSeed((current) => current + 1);

    window.setTimeout(() => {
      const emailInput = document.getElementById(EMAIL_INPUT_ID) as HTMLInputElement | null;
      emailInput?.focus();
    }, 30);
  }

  function handleContinueWithRememberedAccount() {
    setShowCredentialStep(true);
    setFormSeed((current) => current + 1);

    window.setTimeout(() => {
      const passwordInput = document.getElementById(PASSWORD_INPUT_ID) as HTMLInputElement | null;
      passwordInput?.focus();
    }, 30);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submittedEmail = normalizeEmail(String(formData.get("email") ?? ""));
    const submittedPassword = String(formData.get("password") ?? "");

    if (!EMAIL_PATTERN.test(submittedEmail) || submittedPassword.length < 6) {
      event.preventDefault();
      return;
    }

    writeRememberedEmail(submittedEmail);
    setRememberedEmail(submittedEmail);
    setIsSubmitting(true);
  }

  return (
    <AuthShell>
      <AuthCard
        className={cn(
          "space-y-6 rounded-[1.85rem] px-5 py-5 transition-[transform,opacity,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          emailValid ? "border-emerald-400/12 shadow-[0_24px_70px_rgba(0,0,0,0.38)]" : "",
          formReady ? "border-emerald-400/20 shadow-[0_30px_90px_rgba(0,0,0,0.42)]" : "",
          isSubmitting ? "-translate-y-1 scale-[0.995] opacity-95" : "",
        )}
      >
        <form action={login} className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent/90">
                {PASSWORD_LOGIN_UI_COPY.wordmark}
              </p>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                <span>{copy.eyebrow}</span>
              </div>
              <h1 className="text-[clamp(2rem,8vw,2.55rem)] font-semibold tracking-[-0.04em] text-white">{headline}</h1>
              {copy.subtitle ? <p className="text-sm leading-6 text-slate-400">{copy.subtitle}</p> : null}
              {helperText ? (
                <p aria-live="polite" className="max-w-sm text-sm leading-6 text-slate-300">
                  {helperText}
                </p>
              ) : null}
            </div>

            {showRememberedAccountCard && rememberedEmail && rememberedIdentity ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
                    <span className="font-medium text-slate-100">{PASSWORD_LOGIN_UI_COPY.returningUserLabel}</span>
                    <span aria-hidden="true" className="text-slate-500">&middot;</span>
                    <span className="truncate">{rememberedEmail}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                    <span>Ready</span>
                  </div>
                </div>

                <PrimaryButton
                  type={formReady ? "submit" : "button"}
                  fullWidth
                  disabled={isSubmitting}
                  onClick={formReady ? undefined : handleContinueWithRememberedAccount}
                  className={cn(
                    "min-h-[3.35rem] rounded-[1.1rem] text-sm font-semibold tracking-[0.01em] transition-[transform,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none",
                    formReady ? "shadow-[0_18px_38px_rgba(16,185,129,0.18)]" : "shadow-[0_14px_30px_rgba(15,23,42,0.18)]",
                    isSubmitting ? "scale-[0.985]" : "",
                  )}
                >
                  {ctaLabel}
                </PrimaryButton>

                <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
                  <span>{PASSWORD_LOGIN_UI_COPY.switchPrompt}</span>
                  <button
                    type="button"
                    className="font-medium text-slate-200 transition-colors hover:text-white"
                    onClick={handleSwitchAccount}
                  >
                    {PASSWORD_LOGIN_UI_COPY.switchAction}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div
            key={formSeed}
            aria-hidden={!showManualAuth}
            className={cn(
              "space-y-4 transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
              showManualAuth
                ? "max-h-[32rem] opacity-100"
                : "pointer-events-none max-h-0 overflow-hidden opacity-0",
            )}
          >
            <AuthField label="Email">
              <Input
                id={EMAIL_INPUT_ID}
                type="email"
                name="email"
                required
                autoComplete="email"
                defaultValue={rememberedEmail ?? undefined}
                placeholder="you@example.com"
                tabIndex={showManualAuth ? undefined : -1}
                className={cn(
                  "h-14 rounded-[1.15rem] border-white/10 bg-black/20 text-base text-white placeholder:text-slate-500 transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
                  emailValid ? "border-emerald-400/20 bg-emerald-500/[0.05]" : "",
                )}
                onChange={(event) => setEmail(event.target.value)}
              />
            </AuthField>

            <div className="space-y-2">
              <AuthField label="Password">
                <Input
                  id={PASSWORD_INPUT_ID}
                  type="password"
                  name="password"
                  minLength={6}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  tabIndex={showManualAuth ? undefined : -1}
                  className={cn(
                    "h-14 rounded-[1.15rem] border-white/10 bg-black/20 text-base text-white placeholder:text-slate-500 transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
                    passwordValid ? "border-emerald-400/20 bg-emerald-500/[0.05]" : "",
                  )}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </AuthField>
            </div>
          </div>

          {showManualAuth ? (
            <div className="flex justify-end">
              <Link
                className="text-sm font-medium text-accent underline-offset-4 transition-colors hover:text-emerald-200 hover:underline"
                href="/forgot-password"
              >
                {PASSWORD_LOGIN_UI_COPY.forgotPassword}
              </Link>
            </div>
          ) : null}

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

          {showManualAuth ? (
            <PrimaryButton
              type="submit"
              fullWidth
              disabled={!formReady || isSubmitting}
              className={cn(
                "min-h-[3.35rem] rounded-[1.1rem] text-sm font-semibold tracking-[0.01em] transition-[transform,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none",
                formReady ? "shadow-[0_18px_38px_rgba(16,185,129,0.18)]" : "opacity-80",
                isSubmitting ? "scale-[0.985]" : "",
              )}
            >
              {ctaLabel}
            </PrimaryButton>
          ) : null}
        </form>

        {showManualAuth && !hasRememberedAccount ? (
          <AuthFooter>
            <p className="text-center leading-6 text-slate-300">
              {PASSWORD_LOGIN_UI_COPY.createAccountPrefix}{" "}
              <Link href="/signup" className="font-medium text-accent underline-offset-4 transition-colors hover:text-emerald-200 hover:underline">
                {PASSWORD_LOGIN_UI_COPY.createAccountAction}
              </Link>
            </p>
          </AuthFooter>
        ) : null}
      </AuthCard>
    </AuthShell>
  );
}
