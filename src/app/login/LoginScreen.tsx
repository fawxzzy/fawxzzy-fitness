"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
  AUTH_PLAIN_CARD_CHROME_CLASS_NAME,
  AUTH_PRIMARY_DOCK_BUTTON_CLASS_NAME,
  AuthCard,
  AuthDock,
  AuthFooter,
  AuthFooterSeparator,
  AuthFooterText,
  AuthForm,
  AuthFormFields,
  AuthIntro,
  AuthInlineLinkButton,
  AuthShell,
  AuthStack,
} from "@/components/auth/AuthShell";
import { FitContentInput } from "@/components/ui/FitContentInput";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { appTokens } from "@/components/ui/app/tokens";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/ToastProvider";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { cn } from "@/lib/cn";
import {
  deriveRememberedLoginDisplayName,
  readRememberedLoginState,
  toReauthRequiredRememberedLoginState,
  writeRememberedLoginState,
  type RememberedLoginState,
} from "@/lib/remembered-login";
import { clearBrowserSupabaseSession } from "@/lib/supabase/client";
import { isUsernameIdentifier } from "@/lib/username-policy";

const EMAIL_INPUT_ID = "login-email";
const PASSWORD_INPUT_ID = "login-password";
const LOGIN_FORM_ID = "login-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_COOLDOWN_SECONDS = 60;
const RESET_NEXT_ALLOWED_AT_KEY = "fp_next_allowed_at";
const LOGIN_PENDING_TIMEOUT_MS = 12000;
const LOGIN_PENDING_TIMEOUT_MESSAGE = "Login took too long. Check your password or try again.";
const AUTH_FIELD_WIDTH_CLASS_NAME = "w-[15rem] max-w-full";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginScreen({
  error,
  info,
  requiresReauth = false,
  previewRememberedLogin = null,
  previewShowCredentialStep = false,
  returnTo,
}: {
  error?: string;
  info?: string;
  requiresReauth?: boolean;
  previewRememberedLogin?: RememberedLoginState | null;
  previewShowCredentialStep?: boolean;
  returnTo?: string;
}) {
  const loginPendingTimeoutRef = useRef<number | null>(null);
  const copy = AUTH_MODE_COPY["password-login"];
  const resolvedError = error;
  const resolvedInfo = info;
  const resolvedRequiresReauth = requiresReauth;
  const shouldStartCredentialStepOpen =
    previewShowCredentialStep || shouldStartCredentialStepOpenForLogin({ error: resolvedError, requiresReauth: resolvedRequiresReauth });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLoginState | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetCooldownRemaining, setResetCooldownRemaining] = useState(0);
  const [showCredentialStep, setShowCredentialStep] = useState(shouldStartCredentialStepOpen);
  const toast = useToast();

  useToastMessageEffect("error", resolvedError, { id: "login-route-error" });
  useToastMessageEffect("success", resolvedInfo, { id: "login-route-info" });

  useEffect(() => () => {
    if (loginPendingTimeoutRef.current) {
      window.clearTimeout(loginPendingTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!resolvedError && !resolvedInfo) {
      return;
    }

    if (loginPendingTimeoutRef.current) {
      window.clearTimeout(loginPendingTimeoutRef.current);
      loginPendingTimeoutRef.current = null;
    }
    setIsSubmitting(false);
    if (resolvedError) {
      setShowCredentialStep(true);
      setFormSeed((current) => current + 1);
    }
  }, [resolvedError, resolvedInfo]);

  useEffect(() => {
    void clearBrowserSupabaseSession();
  }, []);

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
      // A remembered identity is a convenience for prefilling the full login
      // form, never a separate Continue/Log Out decision screen.
      setShowCredentialStep(true);
    }

  }, [previewRememberedLogin, shouldStartCredentialStepOpen]);

  useEffect(() => {
    const now = Date.now();
    const stored = Number(window.localStorage.getItem(RESET_NEXT_ALLOWED_AT_KEY) ?? "0");

    if (Number.isFinite(stored) && stored > now) {
      setResetCooldownRemaining(Math.ceil((stored - now) / 1000));
    }
  }, []);

  useEffect(() => {
    if (resetCooldownRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextAllowedAt = Number(window.localStorage.getItem(RESET_NEXT_ALLOWED_AT_KEY) ?? "0");
      const seconds = Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000));
      setResetCooldownRemaining(seconds);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resetCooldownRemaining]);

  const rememberedEmail = rememberedLogin?.email ?? null;
  const effectiveRememberedEmail = rememberedEmail;
  const rememberedIdentity = rememberedLogin
    ? { displayName: rememberedLogin.displayName || deriveRememberedLoginDisplayName(rememberedLogin.email) }
    : null;
  const showEmailField = true;

  useEffect(() => {
    if (!showCredentialStep) {
      return;
    }

    const syncFormValues = () => {
      const emailInput = document.getElementById(EMAIL_INPUT_ID) as HTMLInputElement | null;
      const passwordInput = document.getElementById(PASSWORD_INPUT_ID) as HTMLInputElement | null;
      const nextFormState = getSyncedLoginFieldState({
        emailInputValue: emailInput?.value,
        passwordInputValue: passwordInput?.value,
        rememberedEmail: effectiveRememberedEmail ?? rememberedEmail,
        showEmailField,
      });

      setEmail(nextFormState.email);
      setPassword(nextFormState.password);
    };

    const frameId = window.requestAnimationFrame(syncFormValues);
    const timeoutIds = [160, 520, 1100].map((delay) => window.setTimeout(syncFormValues, delay));

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [effectiveRememberedEmail, formSeed, rememberedEmail, showCredentialStep, showEmailField]);

  const viewState = getLoginScreenViewState({
    email,
    password,
    isSubmitting,
    requiresReauth: resolvedRequiresReauth,
  });
  const {
    emailValid,
    passwordValid,
    formReady,
    showManualAuth,
    helperText,
    submitLabel,
  } = viewState;
  const rememberedDisplayName = rememberedIdentity?.displayName ?? null;
  const highlightInteractiveCard = showManualAuth && emailValid;
  const readyInteractiveCard = showManualAuth && formReady;
  const resetPasswordLabel = resetCooldownRemaining > 0 ? `Try again in ${resetCooldownRemaining}s` : PASSWORD_LOGIN_UI_COPY.forgotPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submittedEmail = normalizeEmail(String(formData.get("email") ?? rememberedEmail ?? ""));
    const submittedPassword = String(formData.get("password") ?? "");

    const identifierValid = EMAIL_PATTERN.test(submittedEmail) || isUsernameIdentifier(submittedEmail);
    if (!identifierValid || submittedPassword.length < 6) {
      event.preventDefault();
      return;
    }

    if (loginPendingTimeoutRef.current) {
      window.clearTimeout(loginPendingTimeoutRef.current);
    }
    setIsSubmitting(true);
    setShowCredentialStep(true);
    loginPendingTimeoutRef.current = window.setTimeout(() => {
      loginPendingTimeoutRef.current = null;
      setIsSubmitting(false);
      toast.error(LOGIN_PENDING_TIMEOUT_MESSAGE, { id: "login-submit-timeout" });
    }, LOGIN_PENDING_TIMEOUT_MS);
  }

  async function handlePasswordReset() {
    if (isSendingReset || resetCooldownRemaining > 0) {
      return;
    }

    const identifier = normalizeEmail(email || rememberedEmail || "");
    if (!EMAIL_PATTERN.test(identifier) && !isUsernameIdentifier(identifier)) {
      toast.error("Enter your email or username to reset your password.");
      return;
    }

    setIsSendingReset(true);
    try {
      const result = await requestPasswordResetInline(identifier);
      if (result.ok) {
        const nextAllowedAt = Date.now() + RESET_COOLDOWN_SECONDS * 1000;
        window.localStorage.setItem(RESET_NEXT_ALLOWED_AT_KEY, String(nextAllowedAt));
        setResetCooldownRemaining(RESET_COOLDOWN_SECONDS);
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

  const loginHeader = (
    <AuthStack size="sm" className="mx-auto w-full max-w-sm text-center">
      <AuthIntro eyebrow="" title={copy.title} subtitle={copy.subtitle} />
      {rememberedDisplayName ? (
        <p className={appTokens.authDisplayName}>{rememberedDisplayName}</p>
      ) : null}
      {helperText ? (
        <p
          aria-live="polite"
          className={appTokens.authHelperText}
        >
          {helperText}
        </p>
      ) : null}
    </AuthStack>
  );

  return (
    <AuthShell header={loginHeader}>
      <AuthCard
        className={cn(
          appTokens.authInteractiveCard,
          AUTH_PLAIN_CARD_CHROME_CLASS_NAME,
          highlightInteractiveCard ? appTokens.authInteractiveCardEmailValid : "",
          readyInteractiveCard ? appTokens.authInteractiveCardReady : "",
          isSubmitting ? appTokens.authInteractiveCardPending : "",
        )}
      >
        <AuthForm id={LOGIN_FORM_ID} action={login} onSubmit={handleSubmit}>
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <AuthFormFields
            key={formSeed}
            aria-hidden={!showManualAuth}
            className={cn(
              "transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
              showManualAuth
                ? "max-h-[32rem] opacity-100"
                : "pointer-events-none max-h-0 overflow-hidden opacity-0",
            )}
          >
            {showEmailField ? (
              <LabeledEditorField label="Email or username" className={cn("mx-auto border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none", AUTH_FIELD_WIDTH_CLASS_NAME)}>
                <FitContentInput
                  id={EMAIL_INPUT_ID}
                  type="text"
                  name="email"
                  required
                  autoComplete="username"
                  defaultValue={email || rememberedEmail || undefined}
                  fitContent={false}
                  minVisibleCharacters={17}
                  wrapperClassName="w-full"
                  tabIndex={showManualAuth ? undefined : -1}
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "auth-input-plain h-[54px] w-full min-w-0 px-[18px] py-0 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                    emailValid ? appTokens.authInputActive : "",
                  )}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                />
              </LabeledEditorField>
            ) : null}

            <AuthStack size="sm">
              <LabeledEditorField label="Password" className={cn("mx-auto border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none", AUTH_FIELD_WIDTH_CLASS_NAME)}>
                <PasswordInput
                  id={PASSWORD_INPUT_ID}
                  name="password"
                  minLength={6}
                  required
                  autoComplete="current-password"
                  fitContent={false}
                  minVisibleCharacters={17}
                  wrapperClassName="w-full"
                  tabIndex={showManualAuth ? undefined : -1}
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "auth-input-plain h-[54px] w-full min-w-0 px-[18px] py-0 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                    passwordValid ? appTokens.authInputActive : "",
                  )}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                />
              </LabeledEditorField>
            </AuthStack>
          </AuthFormFields>
        </AuthForm>

        <AuthFooter>
          <AuthFooterText>
            <Link href="/signup" className={cn(appTokens.authInlineLink, "inline-flex items-center px-1 py-0.5 select-none")}>
              {PASSWORD_LOGIN_UI_COPY.createAccountAction}
            </Link>
            <AuthFooterSeparator />
            <AuthInlineLinkButton disabled={isSendingReset || resetCooldownRemaining > 0} onClick={handlePasswordReset}>
              {isSendingReset ? "Sending..." : resetPasswordLabel}
            </AuthInlineLinkButton>
          </AuthFooterText>
        </AuthFooter>
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
              className={cn(AUTH_PRIMARY_DOCK_BUTTON_CLASS_NAME, isSubmitting ? appTokens.authActionButtonPending : "")}
              data-auth-primary-action="true"
            >
              {submitLabel}
            </BottomDockButton>
          </BottomActionSingle>
        </AuthDock>
      ) : null}
    </AuthShell>
  );
}
