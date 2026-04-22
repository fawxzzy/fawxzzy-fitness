"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { login } from "@/app/auth/actions";
import {
  getLoginScreenViewState,
  getSyncedLoginFieldState,
  shouldStartCredentialStepOpenForLogin,
} from "@/app/login/loginScreenState";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import { AuthActionRow, AuthCard, AuthField, AuthFooter, AuthFooterText, AuthForm, AuthMessage, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  buildRememberedLoginState,
  clearRememberedLoginState,
  deriveRememberedLoginDisplayName,
  readRememberedLoginState,
  toReauthRequiredRememberedLoginState,
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
  const shouldStartCredentialStepOpen = shouldStartCredentialStepOpenForLogin({ error, requiresReauth });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLoginState | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentialStep, setShowCredentialStep] = useState(shouldStartCredentialStepOpen);

  useEffect(() => {
    const storedLogin = readRememberedLoginState();

    if (storedLogin?.email) {
      const nextLogin = toReauthRequiredRememberedLoginState(storedLogin);
      setRememberedLogin(nextLogin);
      setEmail(nextLogin.email);
      setFormSeed((current) => current + 1);
      if (nextLogin.sessionState !== storedLogin.sessionState) {
        writeRememberedLoginState(nextLogin);
      }
      if (shouldStartCredentialStepOpen) {
        setShowCredentialStep(true);
      }
    }

    setHasHydrated(true);
  }, [shouldStartCredentialStepOpen]);

  const rememberedEmail = rememberedLogin?.email ?? null;
  const rememberedIdentity = rememberedLogin
    ? { displayName: rememberedLogin.displayName || deriveRememberedLoginDisplayName(rememberedLogin.email) }
    : null;
  const hasRememberedAccount = hasHydrated && Boolean(rememberedEmail);
  const showEmailField = !hasRememberedAccount;

  useEffect(() => {
    if (!showCredentialStep) {
      return;
    }

    const syncFormValues = () => {
      const emailInput = document.getElementById(EMAIL_INPUT_ID) as HTMLInputElement | null;
      const passwordInput = document.getElementById(PASSWORD_INPUT_ID) as HTMLInputElement | null;
      const focusTarget = rememberedEmail ? passwordInput : emailInput ?? passwordInput;
      const nextFormState = getSyncedLoginFieldState({
        emailInputValue: emailInput?.value,
        passwordInputValue: passwordInput?.value,
        rememberedEmail,
        showEmailField,
      });

      setEmail(nextFormState.email);
      setPassword(nextFormState.password);
      if (focusTarget && document.activeElement !== focusTarget) {
        focusTarget.focus();
      }
    };

    const frameId = window.requestAnimationFrame(syncFormValues);
    const timeoutIds = [160, 520, 1100].map((delay) => window.setTimeout(syncFormValues, delay));

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [formSeed, rememberedEmail, showCredentialStep, showEmailField]);

  const viewState = getLoginScreenViewState({
    email,
    password,
    rememberedEmail,
    hasHydrated,
    showCredentialStep,
    isSubmitting,
    requiresReauth,
  });
  const {
    emailValid,
    passwordValid,
    formReady,
    showRememberedAccountCard,
    showManualAuth,
    rememberedAccountPrompt,
    helperText,
    submitLabel,
  } = viewState;
  const rememberedDisplayName = rememberedIdentity?.displayName ?? null;

  function handleSwitchAccount() {
    clearRememberedLoginState();
    setRememberedLogin(null);
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

  function handleRevealCredentialStep() {
    if (!rememberedEmail || isSubmitting) {
      return;
    }

    setShowCredentialStep(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submittedEmail = normalizeEmail(String(formData.get("email") ?? rememberedEmail ?? ""));
    const submittedPassword = String(formData.get("password") ?? "");

    if (!EMAIL_PATTERN.test(submittedEmail) || submittedPassword.length < 6) {
      event.preventDefault();
      return;
    }

    const nextRememberedLogin = buildRememberedLoginState({
      email: submittedEmail,
      displayName: rememberedDisplayName ?? deriveRememberedLoginDisplayName(submittedEmail),
      sessionState: "reauth-required",
    });
    writeRememberedLoginState(nextRememberedLogin);
    setRememberedLogin(nextRememberedLogin);
    setIsSubmitting(true);
    setShowCredentialStep(true);
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
                {helperText ? (
                  <p
                    aria-live="polite"
                    className={cn(
                      appTokens.authHelperText,
                      showRememberedAccountCard ? appTokens.authHelperTextCentered : "",
                    )}
                  >
                    {helperText}
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

                {rememberedAccountPrompt ? (
                  <PrimaryButton
                    type="button"
                    fullWidth
                    disabled={isSubmitting}
                    onClick={handleRevealCredentialStep}
                    className={cn(
                      appTokens.authActionButton,
                      appTokens.authActionButtonReady,
                    )}
                  >
                    {rememberedAccountPrompt.label}
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
            ) : null}

            <AuthStack size="sm">
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
              {submitLabel}
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
