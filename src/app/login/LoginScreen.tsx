"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { login } from "@/app/auth/actions";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import { AuthActionRow, AuthCard, AuthField, AuthFooter, AuthFooterText, AuthForm, AuthMessage, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
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
          appTokens.authInteractiveCard,
          emailValid ? appTokens.authInteractiveCardEmailValid : "",
          formReady ? appTokens.authInteractiveCardReady : "",
          isSubmitting ? appTokens.authInteractiveCardPending : "",
        )}
      >
        <AuthForm action={login} onSubmit={handleSubmit}>
          {showRememberedAccountCard && rememberedEmail ? (
            <input type="hidden" name="email" value={rememberedEmail} />
          ) : null}
          <AuthStack size="lg">
            <AuthStack>
              <div className={cn("flex min-h-8", showRememberedAccountCard ? "justify-end" : "items-start justify-between gap-4")}>
                {!showRememberedAccountCard ? (
                  <p className={appTokens.authWordmark}>{PASSWORD_LOGIN_UI_COPY.wordmark}</p>
                ) : null}
                {showRememberedAccountCard ? (
                  <button
                    type="button"
                    className={appTokens.authUtilityAction}
                    onClick={handleSwitchAccount}
                  >
                    {PASSWORD_LOGIN_UI_COPY.switchAction}
                  </button>
                ) : null}
              </div>
              <AuthStack size="sm" className={showRememberedAccountCard ? "text-center" : "text-left"}>
                <h1 className={appTokens.authIntroTitle}>{copy.title}</h1>
                {rememberedDisplayName ? (
                  <p className={appTokens.authDisplayName}>{rememberedDisplayName}</p>
                ) : null}
                {isReauthFlow ? (
                  <p
                    aria-live="polite"
                    className={cn(
                      appTokens.authHelperText,
                      showRememberedAccountCard ? appTokens.authHelperTextCentered : "",
                    )}
                  >
                    {PASSWORD_LOGIN_UI_COPY.helper.reauth}
                  </p>
                ) : !showRememberedAccountCard && PASSWORD_LOGIN_UI_COPY.helper.default ? (
                  <p aria-live="polite" className={appTokens.authHelperText}>
                    {PASSWORD_LOGIN_UI_COPY.helper.default}
                  </p>
                ) : null}
              </AuthStack>
              {!showRememberedAccountCard && copy.subtitle ? <p className={appTokens.authSubtitleText}>{copy.subtitle}</p> : null}
            </AuthStack>

            {showRememberedAccountCard && rememberedEmail && rememberedIdentity ? (
              <AuthStack>
                <div className={appTokens.authAccountPanel}>
                  <p className={appTokens.authAccountEyebrow}>{PASSWORD_LOGIN_UI_COPY.returningUserLabel}</p>
                  <p className={appTokens.authAccountValue}>{rememberedEmail}</p>
                </div>

                {!showCredentialStep ? (
                  <PrimaryButton
                    type="button"
                    fullWidth
                    disabled={isSubmitting || isRestoring}
                    loading={isRestoring}
                    onClick={handleEnterGym}
                    className={cn(
                      appTokens.authActionButton,
                      appTokens.authActionButtonReady,
                      isRestoring ? appTokens.authActionButtonPending : "",
                    )}
                  >
                      {ctaLabel}
                    </PrimaryButton>
                  ) : null}
              </AuthStack>
            ) : null}
          </AuthStack>

          <AuthStack
            key={formSeed}
            size="md"
            aria-hidden={!showManualAuth}
            className={cn(
              "transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
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
                    appTokens.authInput,
                    emailValid ? appTokens.authInputActive : "",
                  )}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </AuthField>
            ) : (
              <div className={appTokens.authAccountReadonly}>
                <p className={appTokens.authAccountEyebrow}>Account</p>
                <p className={appTokens.authAccountValue}>{rememberedEmail}</p>
              </div>
            )}

            <AuthStack size="sm">
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
                    appTokens.authInput,
                    passwordValid ? appTokens.authInputActive : "",
                  )}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </AuthField>
            </AuthStack>
          </AuthStack>

          {showManualAuth ? (
            <AuthActionRow>
              <Link className={appTokens.authInlineLink} href="/forgot-password">
                {PASSWORD_LOGIN_UI_COPY.forgotPassword}
              </Link>
            </AuthActionRow>
          ) : null}

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

          {showManualAuth ? (
            <PrimaryButton
              type="submit"
              fullWidth
              disabled={!formReady || isSubmitting}
              loading={isSubmitting}
              className={cn(
                appTokens.authActionButton,
                formReady ? appTokens.authActionButtonReady : "opacity-80",
                isSubmitting ? appTokens.authActionButtonPending : "",
              )}
            >
              {ctaLabel}
            </PrimaryButton>
          ) : null}
        </AuthForm>

        {showManualAuth && !hasRememberedAccount ? (
          <AuthFooter>
            <AuthFooterText>
              {PASSWORD_LOGIN_UI_COPY.createAccountPrefix}{" "}
              <Link href="/signup" className={appTokens.authInlineLink}>
                {PASSWORD_LOGIN_UI_COPY.createAccountAction}
              </Link>
            </AuthFooterText>
          </AuthFooter>
        ) : null}
      </AuthCard>
    </AuthShell>
  );
}
