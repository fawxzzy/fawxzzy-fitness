"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { login } from "@/app/auth/actions";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthField, AuthFooter, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  clearRememberedLoginState,
  deriveRememberedLoginDisplayName,
  readRememberedLoginState,
  writeRememberedLoginState,
  type RememberedLoginState,
} from "@/lib/remembered-login";

const EMAIL_INPUT_ID = "login-email";
const PASSWORD_INPUT_ID = "login-password";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginScreen({
  error,
  info,
  requiresReauth = false,
}: {
  error?: string;
  info?: string;
  requiresReauth?: boolean;
}) {
  const copy = AUTH_MODE_COPY["password-login"];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLoginState | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCredentialStep, setShowCredentialStep] = useState(requiresReauth);

  useEffect(() => {
    const storedLogin = readRememberedLoginState();

    if (storedLogin?.email) {
      const nextLogin = requiresReauth
        ? { ...storedLogin, sessionState: "reauth-required" as const }
        : storedLogin;
      setRememberedLogin(nextLogin);
      setEmail(nextLogin.email);
      setFormSeed((current) => current + 1);
      if (nextLogin.sessionState === "reauth-required") {
        writeRememberedLoginState(nextLogin);
        setShowCredentialStep(true);
      }
    }

    setHasHydrated(true);
  }, [requiresReauth]);

  useEffect(() => {
    if (!showCredentialStep) {
      return;
    }

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
  }, [formSeed, showCredentialStep]);

  const normalizedEmail = normalizeEmail(email);
  const emailValid = EMAIL_PATTERN.test(normalizedEmail);
  const passwordValid = password.length >= 6;
  const formReady = emailValid && passwordValid;
  const rememberedEmail = rememberedLogin?.email ?? null;
  const rememberedIdentity = rememberedLogin
    ? { displayName: rememberedLogin.displayName || deriveRememberedLoginDisplayName(rememberedLogin.email) }
    : null;
  const hasRememberedAccount = hasHydrated && Boolean(rememberedEmail) && Boolean(rememberedIdentity);
  const showRememberedAccountCard = hasRememberedAccount;
  const requiresCredentialStep = showCredentialStep || !hasRememberedAccount;
  const isReauthFlow = Boolean(hasRememberedAccount && showCredentialStep);
  const showManualAuth = requiresCredentialStep;
  const showEmailField = !hasRememberedAccount;
  const rememberedDisplayName = rememberedIdentity?.displayName ?? null;

  const ctaLabel = isRestoring
    ? PASSWORD_LOGIN_UI_COPY.cta.restoring
    : isSubmitting
    ? PASSWORD_LOGIN_UI_COPY.cta.pending
    : isReauthFlow
      ? PASSWORD_LOGIN_UI_COPY.cta.reauth
      : showRememberedAccountCard && !showCredentialStep
      ? PASSWORD_LOGIN_UI_COPY.cta.ready
      : formReady
        ? PASSWORD_LOGIN_UI_COPY.cta.ready
        : PASSWORD_LOGIN_UI_COPY.cta.idle;

  function handleSwitchAccount() {
    clearRememberedLoginState();
    setRememberedLogin(null);
    setEmail("");
    setPassword("");
    setIsSubmitting(false);
    setIsRestoring(false);
    setShowCredentialStep(false);
    setFormSeed((current) => current + 1);

    window.setTimeout(() => {
      const emailInput = document.getElementById(EMAIL_INPUT_ID) as HTMLInputElement | null;
      emailInput?.focus();
    }, 30);
  }

  function handleEnterGym() {
    if (!rememberedEmail || isRestoring) {
      return;
    }

    setIsRestoring(true);
    window.location.assign("/entry");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submittedEmail = normalizeEmail(String(formData.get("email") ?? rememberedEmail ?? ""));
    const submittedPassword = String(formData.get("password") ?? "");

    if (!EMAIL_PATTERN.test(submittedEmail) || submittedPassword.length < 6) {
      event.preventDefault();
      return;
    }

    writeRememberedLoginState({
      email: submittedEmail,
      displayName: rememberedDisplayName ?? deriveRememberedLoginDisplayName(submittedEmail),
      sessionState: "ready",
    });
    setRememberedLogin({
      email: submittedEmail,
      displayName: rememberedDisplayName ?? deriveRememberedLoginDisplayName(submittedEmail),
      sessionState: "ready",
      updatedAt: new Date().toISOString(),
    });
    setIsSubmitting(true);
    setIsRestoring(false);
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
          {showRememberedAccountCard && rememberedEmail ? (
            <input type="hidden" name="email" value={rememberedEmail} />
          ) : null}
          <div className="space-y-5">
            <div className="space-y-4">
              <div className={cn("flex min-h-8", showRememberedAccountCard ? "justify-end" : "items-start justify-between gap-4")}>
                {!showRememberedAccountCard ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent/90">
                    {PASSWORD_LOGIN_UI_COPY.wordmark}
                  </p>
                ) : null}
                {showRememberedAccountCard ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                    onClick={handleSwitchAccount}
                  >
                    {PASSWORD_LOGIN_UI_COPY.switchAction}
                  </button>
                ) : null}
              </div>
              <div className={cn("space-y-2", showRememberedAccountCard ? "text-center" : "text-left")}>
                <h1 className="text-[clamp(2rem,8vw,2.55rem)] font-semibold tracking-[-0.04em] text-white">{copy.title}</h1>
                {rememberedDisplayName ? (
                  <p className="text-[clamp(1.75rem,7vw,2.3rem)] font-semibold tracking-[-0.04em] text-slate-100">
                    {rememberedDisplayName}
                  </p>
                ) : null}
                {isReauthFlow ? (
                  <p aria-live="polite" className={cn("text-sm leading-6 text-slate-300", showRememberedAccountCard ? "mx-auto max-w-xs text-center" : "max-w-sm")}>
                    {PASSWORD_LOGIN_UI_COPY.helper.reauth}
                  </p>
                ) : !showRememberedAccountCard && PASSWORD_LOGIN_UI_COPY.helper.default ? (
                  <p aria-live="polite" className="max-w-sm text-sm leading-6 text-slate-300">
                    {PASSWORD_LOGIN_UI_COPY.helper.default}
                  </p>
                ) : null}
              </div>
              {!showRememberedAccountCard && copy.subtitle ? <p className="text-sm leading-6 text-slate-400">{copy.subtitle}</p> : null}
            </div>

            {showRememberedAccountCard && rememberedEmail && rememberedIdentity ? (
              <div className="space-y-4">
                <div className="rounded-[1.15rem] border border-white/10 bg-black/15 px-4 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {PASSWORD_LOGIN_UI_COPY.returningUserLabel}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{rememberedEmail}</p>
                </div>

                {!showCredentialStep ? (
                  <PrimaryButton
                    type="button"
                    fullWidth
                    disabled={isSubmitting || isRestoring}
                    onClick={handleEnterGym}
                    className={cn(
                      "min-h-[3.35rem] rounded-[1.1rem] text-sm font-semibold tracking-[0.01em] transition-[transform,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none",
                      "shadow-[0_18px_38px_rgba(16,185,129,0.18)]",
                      isRestoring ? "scale-[0.985]" : "",
                    )}
                  >
                    {ctaLabel}
                  </PrimaryButton>
                ) : null}
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
            {showEmailField ? (
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
            ) : (
              <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Account</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{rememberedEmail}</p>
              </div>
            )}

            <div className="space-y-2">
              <AuthField label={isReauthFlow ? "Password" : "Password"}>
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
