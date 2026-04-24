"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { login, requestPasswordResetInline } from "@/app/auth/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import {
  getLoginScreenViewState,
  getSyncedLoginFieldState,
  shouldStartCredentialStepOpenForLogin,
} from "@/app/login/loginScreenState";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import {
  AuthCard,
  AuthDock,
  AuthField,
  AuthFooter,
  AuthFooterSeparator,
  AuthFooterText,
  AuthForm,
  AuthInlineLinkButton,
  AuthMessage,
  AuthShell,
  AuthStack,
} from "@/components/auth/AuthShell";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
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
const LOGIN_FORM_ID = "login-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,23}$/i;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginScreen({
  error,
  info,
  requiresReauth = false,
  previewRememberedLogin = null,
  previewShowCredentialStep = false,
}: {
  error?: string;
  info?: string;
  requiresReauth?: boolean;
  previewRememberedLogin?: RememberedLoginState | null;
  previewShowCredentialStep?: boolean;
}) {
  const copy = AUTH_MODE_COPY["password-login"];
  const shouldStartCredentialStepOpen =
    previewShowCredentialStep || shouldStartCredentialStepOpenForLogin({ error, requiresReauth });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLoginState | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showCredentialStep, setShowCredentialStep] = useState(shouldStartCredentialStepOpen);
  const toast = useToast();

  useEffect(() => {
    const storedLogin = previewRememberedLogin ?? readRememberedLoginState();

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
  }, [previewRememberedLogin, shouldStartCredentialStepOpen]);

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
  const showRememberedAccountChoice = showRememberedAccountCard && Boolean(rememberedEmail) && !showCredentialStep;
  const highlightInteractiveCard = showManualAuth && emailValid;
  const readyInteractiveCard = showManualAuth && formReady;

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

    const identifierValid = EMAIL_PATTERN.test(submittedEmail) || USERNAME_PATTERN.test(submittedEmail);
    if (!identifierValid || submittedPassword.length < 6) {
      event.preventDefault();
      return;
    }

    if (EMAIL_PATTERN.test(submittedEmail)) {
      const nextRememberedLogin = buildRememberedLoginState({
        email: submittedEmail,
        displayName: rememberedDisplayName ?? deriveRememberedLoginDisplayName(submittedEmail),
        sessionState: "reauth-required",
      });
      writeRememberedLoginState(nextRememberedLogin);
      setRememberedLogin(nextRememberedLogin);
    }
    setIsSubmitting(true);
    setShowCredentialStep(true);
  }

  async function handlePasswordReset() {
    if (isSendingReset) {
      return;
    }

    const identifier = normalizeEmail(email || rememberedEmail || "");
    if (!EMAIL_PATTERN.test(identifier) && !USERNAME_PATTERN.test(identifier)) {
      toast.error("Enter your email to reset your password.");
      return;
    }

    setIsSendingReset(true);
    try {
      const result = await requestPasswordResetInline(identifier);
      if (result.ok) {
        toast.success("Reset email sent. Check your inbox.");
        return;
      }

      toast.error(result.error ?? "Could not send reset email. Please try again.");
    } catch {
      toast.error("Could not send reset email. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <AuthShell>
      <AuthCard
        className={cn(
          appTokens.authInteractiveCard,
          highlightInteractiveCard ? appTokens.authInteractiveCardEmailValid : "",
          readyInteractiveCard ? appTokens.authInteractiveCardReady : "",
          isSubmitting ? appTokens.authInteractiveCardPending : "",
        )}
      >
        <AuthForm id={LOGIN_FORM_ID} action={login} onSubmit={handleSubmit}>
          {showRememberedAccountCard && rememberedEmail ? (
            <input type="hidden" name="email" value={rememberedEmail} />
          ) : null}
          <AuthStack size="lg">
            <AuthStack>
              <div className="flex min-h-8 items-center justify-center">
                <p className={appTokens.authWordmark}>{PASSWORD_LOGIN_UI_COPY.wordmark}</p>
              </div>
              <AuthStack size="sm" className="text-center">
                <h1 className={appTokens.authIntroTitle}>{copy.title}</h1>
                {rememberedDisplayName ? (
                  <p className={appTokens.authDisplayName}>{rememberedDisplayName}</p>
                ) : null}
                {helperText && !showRememberedAccountChoice ? (
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
              <AuthField label="Email" hideLabel>
                <Input
                  id={EMAIL_INPUT_ID}
                  type="text"
                  name="email"
                  required
                  autoComplete="username"
                  defaultValue={rememberedEmail ?? undefined}
                  placeholder="you@example.com / username"
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
              <AuthField label="Password" hideLabel>
                <Input
                  id={PASSWORD_INPUT_ID}
                  type="password"
                  name="password"
                  minLength={6}
                  required
                  autoComplete="current-password"
                  placeholder="password"
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

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

        </AuthForm>

        {showManualAuth ? (
          <AuthFooter>
            <AuthFooterText>
              <Link href="/signup" className={appTokens.authInlineLink}>
                {PASSWORD_LOGIN_UI_COPY.createAccountAction}
              </Link>
              <AuthFooterSeparator />
              <AuthInlineLinkButton disabled={isSendingReset} onClick={handlePasswordReset}>
                {isSendingReset ? "Sending..." : PASSWORD_LOGIN_UI_COPY.forgotPassword}
              </AuthInlineLinkButton>
            </AuthFooterText>
          </AuthFooter>
        ) : showRememberedAccountChoice ? (
          <AuthFooter>
            <AuthFooterText>
              <AuthInlineLinkButton onClick={handleSwitchAccount}>
                Log Out
              </AuthInlineLinkButton>
            </AuthFooterText>
          </AuthFooter>
        ) : null}
      </AuthCard>

      {showManualAuth ? (
        <AuthDock>
          <BottomActionSingle>
            <BottomDockButton
              type="submit"
              form={LOGIN_FORM_ID}
              intent="positive"
              disabled={!formReady || isSubmitting}
              loading={isSubmitting}
              loadingLabel={PASSWORD_LOGIN_UI_COPY.cta.pending}
              className={cn(isSubmitting ? appTokens.authActionButtonPending : "")}
            >
              {submitLabel}
            </BottomDockButton>
          </BottomActionSingle>
        </AuthDock>
      ) : showRememberedAccountChoice && rememberedAccountPrompt ? (
        <AuthDock>
          <BottomActionSingle>
            <BottomDockButton
              type="button"
              intent="positive"
              disabled={isSubmitting}
              onClick={handleRevealCredentialStep}
            >
              {rememberedAccountPrompt.label}
            </BottomDockButton>
          </BottomActionSingle>
        </AuthDock>
      ) : null}
    </AuthShell>
  );
}
