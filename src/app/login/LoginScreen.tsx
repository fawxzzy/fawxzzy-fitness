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
  const initialsSource = segments.length > 0 ? segments : [localPart];

  return {
    firstName: toTitleCaseSegment(primarySegment) || "Athlete",
    initials:
      initialsSource
        .slice(0, 2)
        .map((segment) => segment.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2) || "FF",
  };
}

function WarmUpProgress({ progress, isSubmitting }: { progress: number; isSubmitting: boolean }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - ((circumference * progress) / 100);

  return (
    <div className="flex shrink-0 self-start items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/20">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              "transition-[stroke,stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none",
              progress === 100 || isSubmitting
                ? "text-emerald-300"
                : progress === 50
                  ? "text-emerald-400/80"
                  : "text-slate-500/70",
            )}
          />
        </svg>
        <span className="text-[9px] font-semibold tracking-[0.08em] text-slate-200">{progress}</span>
      </div>

      <div className="space-y-0.5 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {PASSWORD_LOGIN_UI_COPY.progressLabel}
        </p>
        <p className="text-sm font-semibold text-white">{progress === 100 ? "Ready" : `${progress}%`}</p>
      </div>

      <progress className="sr-only" max={100} value={progress}>
        {progress}%
      </progress>
    </div>
  );
}

export function LoginScreen({ error, info }: { error?: string; info?: string }) {
  const copy = AUTH_MODE_COPY["password-login"];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const timeoutId = window.setTimeout(syncFormValues, 160);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [formSeed]);

  const normalizedEmail = normalizeEmail(email);
  const emailValid = EMAIL_PATTERN.test(normalizedEmail);
  const passwordValid = password.length >= 6;
  const formReady = emailValid && passwordValid;
  const progress = formReady ? 100 : emailValid ? 50 : 0;
  const rememberedIdentity = rememberedEmail ? getRememberedIdentity(rememberedEmail) : null;
  const showRememberedIdentity =
    hasHydrated
    && Boolean(rememberedEmail)
    && Boolean(rememberedIdentity)
    && (normalizedEmail === "" || normalizedEmail === normalizeEmail(rememberedEmail ?? ""));

  const helperText = formReady
    ? PASSWORD_LOGIN_UI_COPY.helper.ready
    : emailValid
      ? PASSWORD_LOGIN_UI_COPY.helper.emailValid
      : PASSWORD_LOGIN_UI_COPY.helper.default;

  const headline = showRememberedIdentity && rememberedIdentity
    ? `${copy.title}, ${rememberedIdentity.firstName}`
    : copy.title;

  const ctaLabel = isSubmitting
    ? PASSWORD_LOGIN_UI_COPY.cta.pending
    : formReady
      ? PASSWORD_LOGIN_UI_COPY.cta.ready
      : PASSWORD_LOGIN_UI_COPY.cta.idle;

  function handleSwitchAccount() {
    clearRememberedEmail();
    setRememberedEmail(null);
    setEmail("");
    setPassword("");
    setIsSubmitting(false);
    setFormSeed((current) => current + 1);

    window.setTimeout(() => {
      const emailInput = document.getElementById(EMAIL_INPUT_ID) as HTMLInputElement | null;
      emailInput?.focus();
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent/90">
                  {PASSWORD_LOGIN_UI_COPY.wordmark}
                </p>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                  <span>{copy.eyebrow}</span>
                </div>
                <p className="text-sm leading-6 text-slate-400">{copy.subtitle}</p>
              </div>

              <WarmUpProgress progress={progress} isSubmitting={isSubmitting} />
            </div>

            {showRememberedIdentity && rememberedEmail && rememberedIdentity ? (
              <div className="flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.03] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/12 text-sm font-semibold text-emerald-50">
                    {rememberedIdentity.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {PASSWORD_LOGIN_UI_COPY.returningUserLabel}
                    </p>
                    <p className="truncate text-sm font-medium text-slate-100">{rememberedEmail}</p>
                  </div>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {PASSWORD_LOGIN_UI_COPY.switchPrompt}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-300 transition-colors hover:text-white"
                    onClick={handleSwitchAccount}
                  >
                    {PASSWORD_LOGIN_UI_COPY.switchAction}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <h1 className="text-[clamp(2rem,8vw,2.55rem)] font-semibold tracking-[-0.04em] text-white">{headline}</h1>
              <p aria-live="polite" className="max-w-sm text-sm leading-6 text-slate-300">
                {helperText}
              </p>
            </div>
          </div>

          <div key={formSeed} className="space-y-4">
            <AuthField label="Email">
              <Input
                id={EMAIL_INPUT_ID}
                type="email"
                name="email"
                required
                autoComplete="email"
                defaultValue={rememberedEmail ?? undefined}
                placeholder="you@example.com"
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
                  className={cn(
                    "h-14 rounded-[1.15rem] border-white/10 bg-black/20 text-base text-white placeholder:text-slate-500 transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
                    passwordValid ? "border-emerald-400/20 bg-emerald-500/[0.05]" : "",
                  )}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </AuthField>

              <div className="flex justify-end">
                <Link
                  className="text-sm font-medium text-accent underline-offset-4 transition-colors hover:text-emerald-200 hover:underline"
                  href="/forgot-password"
                >
                  {PASSWORD_LOGIN_UI_COPY.forgotPassword}
                </Link>
              </div>
            </div>
          </div>

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

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
        </form>

        <AuthFooter>
          <p className="text-center leading-6 text-slate-300">
            {PASSWORD_LOGIN_UI_COPY.createAccountPrefix}{" "}
            <Link href="/signup" className="font-medium text-accent underline-offset-4 transition-colors hover:text-emerald-200 hover:underline">
              {PASSWORD_LOGIN_UI_COPY.createAccountAction}
            </Link>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
