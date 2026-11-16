"use client";

import { type FormEvent, useEffect, useState } from "react";
import { signup } from "@/app/auth/actions";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import {
  AUTH_ACCOUNT_INPUT_CLASS_NAME,
  AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME,
  AuthAccountField,
  AuthLockedField,
} from "@/components/auth/AuthAccountField";
import {
  AuthBody,
  AuthDockButton,
  AuthDockLink,
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
  isSignupCheckEmailInfo,
  signupErrorNoticeId,
  formatResendCountdown,
  type AuthMessageId,
  type AuthNotice,
} from "@/components/auth/authMessages";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { isValidNewPassword, NEW_PASSWORD_MINIMUM } from "@/lib/password-policy";
import { readRememberedLoginState, writeRememberedLoginState } from "@/lib/remembered-login";
import {
  forgetStashedRememberedLogin,
  restoreRememberedLoginAfterFailedSignup,
  stashRememberedLoginBeforeSignup,
} from "@/components/auth/signupRememberedLogin";
import { isUsernameIdentifier, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/username-policy";

const SIGNUP_FORM_ID = "signup-form";
const SENT_WAIT_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupField = "username" | "email" | "password";

const NOTICE_FIELD: Partial<Record<AuthMessageId, SignupField>> = {
  "signup.taken": "username",
  "signup.userinvalid": "username",
  "signup.emailinvalid": "email",
  "signup.pwshort": "password",
  "signup.pwweak": "password",
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Create account (Auth Surface v2). `error` / `info` arrive already resolved from an allow-listed code by the /signup
 * page and are shown as matrix notices in the reserved slot. After submit the address is confirmed by email: the
 * fields stay, locked, with the "Check {e}" notice.
 */
export function SignupForm({
  error,
  info,
  previewNotice = null,
  previewSent = null,
}: {
  error?: string;
  info?: string;
  previewNotice?: AuthMessageId | null;
  previewSent?: { username: string; email: string } | null;
}) {
  const initialErrorId = previewNotice ?? signupErrorNoticeId(error);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<AuthNotice | null>(initialErrorId ? authNotice(initialErrorId) : null);
  const [invalidField, setInvalidField] = useState<SignupField | null>(initialErrorId ? NOTICE_FIELD[initialErrorId] ?? null : null);
  const [sent, setSent] = useState<{ username: string; email: string } | null>(previewSent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentWait, setSentWait] = useState(0);

  // The confirmation email just went out: the dock waits before offering the next step (same timer as reset).
  useEffect(() => {
    if (!sent) {
      setSentWait(0);
      return;
    }
    setSentWait(SENT_WAIT_SECONDS);
    if (previewSent) {
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, SENT_WAIT_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setSentWait(left);
      if (left === 0) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sent, previewSent]);

  useEffect(() => {
    if (previewSent) {
      setNotice(authNotice("signup.sent", { email: previewSent.email }));
      return;
    }
    // The values were saved on this device at submit (remembered login): bring them back after the redirect.
    const remembered = readRememberedLoginState();
    if (isSignupCheckEmailInfo(info)) {
      forgetStashedRememberedLogin();
    }
    if (isSignupCheckEmailInfo(info) && remembered?.email) {
      setSent({ username: remembered.displayName ?? "", email: remembered.email });
      setNotice(authNotice("signup.sent", { email: remembered.email }));
      return;
    }
    if (isSignupCheckEmailInfo(info)) {
      // Another device or cleared storage: the address is unknown here, the notice says "your email".
      setNotice(authNotice("signup.sent"));
      return;
    }
    if (!error) {
      return;
    }
    // The action redirected back with a code (the page resolved it): show it, free the dock, mark its field.
    const errorId = signupErrorNoticeId(error);
    setIsSubmitting(false);
    if (errorId) {
      setNotice(authNotice(errorId));
      setInvalidField(NOTICE_FIELD[errorId] ?? null);
    }
    if (remembered?.email) {
      setEmail(remembered.email);
      setUsername(remembered.displayName ?? "");
    }
    // The attempt failed: the address typed here is not an account, so it must not stay the remembered login.
    restoreRememberedLoginAfterFailedSignup();
  }, [error, info, previewSent]);

  const canSubmit = Boolean(username.trim() && email.trim() && password);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const nextEmail = normalizeEmail(String(formData.get("email") ?? ""));
    const nextUsername = String(formData.get("username") ?? "").trim();
    const nextPassword = String(formData.get("password") ?? "");

    const failure: [SignupField, AuthMessageId] | null = !isUsernameIdentifier(nextUsername)
      ? ["username", "signup.userinvalid"]
      : !EMAIL_PATTERN.test(nextEmail)
        ? ["email", "signup.emailinvalid"]
        : !isValidNewPassword(nextPassword)
          ? ["password", "signup.pwshort"]
          : null;
    if (failure) {
      event.preventDefault();
      setInvalidField(failure[0]);
      setNotice(authNotice(failure[1]));
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      event.preventDefault();
      setNotice(authNotice("signin.offline"));
      return;
    }

    setInvalidField(null);
    setNotice(null);
    setIsSubmitting(true);
    stashRememberedLoginBeforeSignup();
    writeRememberedLoginState({
      email: nextEmail,
      displayName: nextUsername || undefined,
      sessionState: "reauth-required",
    });
  }

  const title = AUTH_MODE_COPY["create-account"].title;

  if (sent) {
    return (
      <AuthShell>
        <AuthHead title={title} />
        <AuthBody aria-label="Fitness account creation" data-auth-intent="signup" data-auth-surface="credentials">
          <AuthFormFields>
            {sent.username ? <AuthLockedField id="signup-username" label="Username" value={sent.username} /> : null}
            <AuthLockedField id="signup-email" label="Email" value={sent.email} />
          </AuthFormFields>
          <AuthNoticeSlot notice={notice} />
        </AuthBody>
        <AuthLinks>
          <AuthLinkButton
            onClick={() => {
              setUsername(sent.username);
              setEmail(sent.email);
              setSent(null);
              setNotice(null);
            }}
          >
            Wrong email?
          </AuthLinkButton>
        </AuthLinks>
        <AuthLegalRow />
        {sentWait > 0 ? (
          <AuthDockButton type="button" disabled>{formatResendCountdown(sentWait)}</AuthDockButton>
        ) : (
          <AuthDockLink href="/login">Sign in</AuthDockLink>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHead title={title} />
      <AuthBody aria-label="Fitness account creation" data-auth-intent="signup" data-auth-surface="credentials">
        <AuthForm id={SIGNUP_FORM_ID} action={signup} onSubmit={handleSubmit} noValidate>
          <AuthFormFields>
            <AuthAccountField label="Username" htmlFor="signup-username" invalid={invalidField === "username"}>
              <input
                id="signup-username"
                type="text"
                name="username"
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                pattern="[A-Za-z0-9._-]{2,15}"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                readOnly={isSubmitting}
                aria-invalid={invalidField === "username" || undefined}
                className={AUTH_ACCOUNT_INPUT_CLASS_NAME}
                onChange={(event) => setUsername(event.target.value)}
              />
            </AuthAccountField>
            <AuthAccountField label="Email" htmlFor="signup-email" invalid={invalidField === "email"}>
              <input
                id="signup-email"
                type="email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                readOnly={isSubmitting}
                aria-invalid={invalidField === "email" || undefined}
                className={AUTH_ACCOUNT_INPUT_CLASS_NAME}
                onChange={(event) => setEmail(event.target.value)}
              />
            </AuthAccountField>
            <AuthAccountField label="Password" htmlFor="signup-password" invalid={invalidField === "password"}>
              <PasswordInput
                id="signup-password"
                name="password"
                minLength={NEW_PASSWORD_MINIMUM}
                autoComplete="new-password"
                readOnly={isSubmitting}
                aria-invalid={invalidField === "password" || undefined}
                wrapperClassName="w-full"
                className={AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME}
                onChange={(event) => setPassword(event.target.value)}
              />
            </AuthAccountField>
          </AuthFormFields>
          <AuthNoticeSlot
            notice={notice}
            onAction={notice?.id === "signup.emailexists" ? () => window.location.assign("/login") : undefined}
          />
        </AuthForm>
      </AuthBody>
      <AuthLinks>
        <AuthLink href="/login">Sign in</AuthLink>
      </AuthLinks>
      <AuthLegalRow />
      <AuthDockButton
        type="submit"
        form={SIGNUP_FORM_ID}
        busy={isSubmitting}
        busyLabel="Creating account…"
        disabled={!canSubmit}
      >
        Create account
      </AuthDockButton>
    </AuthShell>
  );
}
