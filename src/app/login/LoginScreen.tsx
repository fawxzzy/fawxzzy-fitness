"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { login } from "@/app/auth/actions";
import ForgotPasswordFormClient from "@/app/forgot-password/ForgotPasswordFormClient";
import { getLoginScreenViewState } from "@/app/login/loginScreenState";
import { AUTH_MODE_COPY, PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import {
  AUTH_ACCOUNT_INPUT_CLASS_NAME,
  AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME,
  AuthAccountField,
  AuthLockedField,
} from "@/components/auth/AuthAccountField";
import {
  AuthBody,
  AuthDockButton,
  AuthForm,
  AuthFormFields,
  AuthHead,
  AuthLegalRow,
  AuthLink,
  AuthLinkButton,
  AuthLinks,
  AuthNoticeSlot,
  AuthShell,
} from "@/components/auth/AuthShell";
import {
  authNotice,
  loginErrorNoticeId,
  loginInfoNoticeId,
  type AuthMessageId,
  type AuthNotice,
} from "@/components/auth/authMessages";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  clearRememberedLoginState,
  readRememberedLoginState,
  toReauthRequiredRememberedLoginState,
  writeRememberedLoginState,
  type RememberedLoginState,
} from "@/lib/remembered-login";
import { isUsernameIdentifier } from "@/lib/username-policy";

const EMAIL_INPUT_ID = "login-email";
const PASSWORD_INPUT_ID = "login-password";
const REMEMBERED_INPUT_ID = "login-remembered";
const LOGIN_FORM_ID = "login-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_PENDING_TIMEOUT_MS = 12000;

// Route messages about a reset link open the reset request screen with their notice (never a dead end).
const RESET_ROUTE_NOTICES: ReadonlySet<AuthMessageId> = new Set(["reset.expired", "reset.invalid", "reset.rate", "reset.sendfail", "signup.userinvalid"]);

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function resolveRouteNotice(error?: string, info?: string, requiresReauth?: boolean): AuthNotice | null {
  const errorId = loginErrorNoticeId(error);
  if (errorId) {
    return authNotice(errorId);
  }
  if (requiresReauth) {
    return authNotice("signin.session");
  }
  const infoId = loginInfoNoticeId(info);
  return infoId ? authNotice(infoId) : null;
}

export function LoginScreen({
  error,
  info,
  requiresReauth = false,
  previewRememberedLogin = null,
  previewShowCredentialStep: _previewShowCredentialStep = false,
  previewNotice = null,
  previewBusy = false,
  returnTo,
}: {
  error?: string;
  info?: string;
  requiresReauth?: boolean;
  previewRememberedLogin?: RememberedLoginState | null;
  previewShowCredentialStep?: boolean;
  previewNotice?: AuthMessageId | null;
  previewBusy?: boolean;
  returnTo?: string;
}) {
  const routeNotice = previewNotice ? authNotice(previewNotice) : resolveRouteNotice(error, info, requiresReauth);
  const opensOnReset = Boolean(routeNotice && RESET_ROUTE_NOTICES.has(routeNotice.id));
  const loginPendingTimeoutRef = useRef<number | null>(null);
  const [view, setView] = useState<"signin" | "reset">(opensOnReset ? "reset" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLoginState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(previewBusy);
  const [notice, setNotice] = useState<AuthNotice | null>(opensOnReset ? null : routeNotice);
  const [invalidFields, setInvalidFields] = useState<{ identifier: boolean; password: boolean }>({
    identifier: routeNotice?.id === "signin.wrong" || routeNotice?.id === "signin.empty",
    password: routeNotice?.id === "signin.wrong" || routeNotice?.id === "signin.empty",
  });

  useEffect(() => () => {
    if (loginPendingTimeoutRef.current) {
      window.clearTimeout(loginPendingTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!error && !info) {
      return;
    }
    if (loginPendingTimeoutRef.current) {
      window.clearTimeout(loginPendingTimeoutRef.current);
      loginPendingTimeoutRef.current = null;
    }
    setIsSubmitting(false);
    // The sign-in action redirected back with a code: it replaces whatever the box said (one notice at a time).
    const nextNotice = resolveRouteNotice(error, info, false);
    if (nextNotice && RESET_ROUTE_NOTICES.has(nextNotice.id)) {
      setView("reset");
      return;
    }
    if (nextNotice) {
      setNotice(nextNotice);
      const marksFields = nextNotice.id === "signin.wrong";
      setInvalidFields({ identifier: marksFields, password: marksFields });
    }
  }, [error, info]);

  useEffect(() => {
    const storedLogin = previewRememberedLogin ?? readRememberedLoginState();
    if (storedLogin?.email) {
      const nextLogin = toReauthRequiredRememberedLoginState(storedLogin);
      setRememberedLogin(nextLogin);
      setEmail(nextLogin.email);
      if (!previewRememberedLogin && nextLogin.sessionState !== storedLogin.sessionState) {
        writeRememberedLoginState(nextLogin);
      }
    }
  }, [previewRememberedLogin]);

  const rememberedEmail = rememberedLogin?.email ?? null;
  // The remembered account is a locked field, never a name under the title. Username when we have one, else email.
  const rememberedLabel = rememberedLogin?.displayName && isUsernameIdentifier(rememberedLogin.displayName) ? "Username" : "Email";
  const rememberedValue = rememberedLabel === "Username" ? rememberedLogin?.displayName ?? "" : rememberedEmail ?? "";
  const { submitLabel } = getLoginScreenViewState({ email, password, isSubmitting, requiresReauth });

  function startPendingTimeout() {
    if (loginPendingTimeoutRef.current) {
      window.clearTimeout(loginPendingTimeoutRef.current);
    }
    loginPendingTimeoutRef.current = window.setTimeout(() => {
      loginPendingTimeoutRef.current = null;
      setIsSubmitting(false);
      setNotice(authNotice("signin.unavailable"));
    }, LOGIN_PENDING_TIMEOUT_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }
    const formData = new FormData(event.currentTarget);
    const submittedIdentifier = normalizeIdentifier(String(formData.get("email") ?? rememberedEmail ?? ""));
    const submittedPassword = String(formData.get("password") ?? "");

    if (!submittedIdentifier || !submittedPassword) {
      event.preventDefault();
      setInvalidFields({ identifier: !submittedIdentifier, password: !submittedPassword });
      setNotice(authNotice("signin.empty"));
      return;
    }

    const identifierValid = EMAIL_PATTERN.test(submittedIdentifier) || isUsernameIdentifier(submittedIdentifier);
    if (!identifierValid || submittedPassword.length < 6) {
      event.preventDefault();
      setInvalidFields({ identifier: !identifierValid, password: submittedPassword.length < 6 });
      setNotice(authNotice("signin.wrong"));
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      event.preventDefault();
      setNotice(authNotice("signin.offline"));
      return;
    }

    setInvalidFields({ identifier: false, password: false });
    setNotice(null);
    setIsSubmitting(true);
    startPendingTimeout();
  }

  function forgetRememberedAccount() {
    clearRememberedLoginState();
    setRememberedLogin(null);
    setEmail("");
    setNotice(null);
  }

  if (view === "reset") {
    const typed = normalizeIdentifier(email);
    const initialUsername = rememberedLogin?.displayName && isUsernameIdentifier(rememberedLogin.displayName)
      ? rememberedLogin.displayName
      : isUsernameIdentifier(typed) ? typed : "";
    return (
      <ForgotPasswordFormClient
        initialUsername={initialUsername}
        initialNotice={opensOnReset ? routeNotice : null}
        onBackToSignIn={() => {
          setNotice(null);
          setView("signin");
        }}
        returnTo={returnTo}
      />
    );
  }

  return (
    <AuthShell>
      <AuthHead title={rememberedLogin ? "Welcome back" : AUTH_MODE_COPY["password-login"].title} />
      <AuthBody aria-label="Fitness account sign in" data-auth-intent="login" data-auth-surface="credentials">
        <AuthForm id={LOGIN_FORM_ID} action={login} onSubmit={handleSubmit} noValidate>
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <AuthFormFields>
            {rememberedLogin ? (
              <>
                <input type="hidden" name="email" value={rememberedEmail ?? ""} />
                <AuthLockedField id={REMEMBERED_INPUT_ID} name="remembered-account" autoComplete="username" label={rememberedLabel} value={rememberedValue} />
              </>
            ) : (
              <AuthAccountField label="Email or username" htmlFor={EMAIL_INPUT_ID} invalid={invalidFields.identifier}>
                <input
                  id={EMAIL_INPUT_ID}
                  type="text"
                  name="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  readOnly={isSubmitting}
                  aria-invalid={invalidFields.identifier || undefined}
                  className={AUTH_ACCOUNT_INPUT_CLASS_NAME}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setInvalidFields((current) => ({ ...current, identifier: false }));
                  }}
                />
              </AuthAccountField>
            )}
            <AuthAccountField label="Password" htmlFor={PASSWORD_INPUT_ID} invalid={invalidFields.password}>
              <PasswordInput
                id={PASSWORD_INPUT_ID}
                name="password"
                autoComplete="current-password"
                readOnly={isSubmitting}
                aria-invalid={invalidFields.password || undefined}
                wrapperClassName="w-full"
                className={AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setInvalidFields((current) => ({ ...current, password: false }));
                }}
              />
            </AuthAccountField>
          </AuthFormFields>
          <AuthNoticeSlot notice={notice} />
        </AuthForm>
      </AuthBody>
      <AuthLinks>
        {rememberedLogin ? (
          <AuthLinkButton onClick={forgetRememberedAccount}>Not you?</AuthLinkButton>
        ) : (
          <>
            <AuthLink href="/signup">{PASSWORD_LOGIN_UI_COPY.createAccountAction}</AuthLink>
            <AuthLinkButton onClick={() => setView("reset")}>{PASSWORD_LOGIN_UI_COPY.forgotPassword}</AuthLinkButton>
          </>
        )}
      </AuthLinks>
      <AuthLegalRow returnTo={returnTo} />
      <AuthDockButton
        type="submit"
        form={LOGIN_FORM_ID}
        busy={isSubmitting}
        busyLabel={PASSWORD_LOGIN_UI_COPY.cta.pending}
      >
        {submitLabel}
      </AuthDockButton>
    </AuthShell>
  );
}
