"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { requestPasswordResetInline } from "@/app/auth/actions";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import {
  AUTH_ACCOUNT_INPUT_CLASS_NAME,
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
  formatResendCountdown,
  resetRequestNoticeId,
  type AuthNotice,
} from "@/components/auth/authMessages";
import { isUsernameIdentifier, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/username-policy";

export const RESET_COOLDOWN_SECONDS = 60;
export const RESET_NEXT_ALLOWED_AT_KEY = "fp_next_allowed_at";
const RESET_FORM_ID = "reset-request-form";
const RESET_USERNAME_INPUT_ID = "reset-username";
const RESET_EMAIL_INPUT_ID = "reset-email";

export const RESET_REQUEST_LEAD = "We will email a reset link to the address on your account.";

function readCooldownSeconds() {
  const stored = Number(window.localStorage.getItem(RESET_NEXT_ALLOWED_AT_KEY) ?? "0");
  return Number.isFinite(stored) && stored > Date.now() ? Math.ceil((stored - Date.now()) / 1000) : 0;
}

/**
 * Reset request (Auth Surface v2). The address is never typed: signed out it takes a username only (the answer never
 * says whether the account exists); signed in it shows the account email locked. Success keeps the field, locked, and
 * the dock turns into a resend timer. Expired or invalid reset links land here with their notice.
 */
export default function ForgotPasswordFormClient({
  signedInEmail = null,
  initialUsername = "",
  initialNotice = null,
  onBackToSignIn,
  previewSent = false,
  returnTo,
}: {
  signedInEmail?: string | null;
  initialUsername?: string;
  initialNotice?: AuthNotice | null;
  onBackToSignIn?: () => void;
  previewSent?: boolean;
  returnTo?: string;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [notice, setNotice] = useState<AuthNotice | null>(initialNotice);
  const [invalid, setInvalid] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(previewSent);
  const [cooldown, setCooldown] = useState(previewSent ? RESET_COOLDOWN_SECONDS : 0);
  // The lab preview counts down exactly like the real flow (60, 59, 58...): its deadline is one cooldown after it opened.
  const previewDeadline = useRef<number | null>(null);

  const readCooldown = () => {
    if (previewSent) {
      previewDeadline.current ??= Date.now() + RESET_COOLDOWN_SECONDS * 1000;
      return Math.max(0, Math.ceil((previewDeadline.current - Date.now()) / 1000));
    }
    return readCooldownSeconds();
  };

  useEffect(() => {
    setCooldown(readCooldown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSent]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => setCooldown(readCooldown()), 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldown, previewSent]);

  useEffect(() => {
    if (previewSent) {
      setNotice(signedInEmail ? authNotice("reset.sent", { email: signedInEmail }) : authNotice("reset.sentany"));
    }
  }, [previewSent, signedInEmail]);

  const identifier = signedInEmail ?? username.trim().toLowerCase();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending || cooldown > 0) {
      return;
    }
    if (!signedInEmail && !isUsernameIdentifier(identifier)) {
      setInvalid(true);
      setNotice(authNotice("signup.userinvalid"));
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setNotice(authNotice("signin.offline"));
      return;
    }

    setInvalid(false);
    setIsSending(true);
    try {
      const result = await requestPasswordResetInline(identifier);
      if (result.ok) {
        window.localStorage.setItem(RESET_NEXT_ALLOWED_AT_KEY, String(Date.now() + RESET_COOLDOWN_SECONDS * 1000));
        setCooldown(RESET_COOLDOWN_SECONDS);
        setSent(true);
        setNotice(signedInEmail ? authNotice("reset.sent", { email: signedInEmail }) : authNotice("reset.sentany"));
        return;
      }
      setNotice(authNotice(resetRequestNoticeId("code" in result ? result.code : null)));
    } catch {
      setNotice(authNotice("reset.sendfail"));
    } finally {
      setIsSending(false);
    }
  }

  const dockLabel = cooldown > 0 ? formatResendCountdown(cooldown) : "Send reset link";

  return (
    <AuthShell>
      <AuthHead title={AUTH_MODE_COPY["reset-password"].title} lead={RESET_REQUEST_LEAD} />
      <AuthBody aria-label="Fitness password reset" data-auth-intent="reset-request" data-auth-surface="recovery">
        <AuthForm id={RESET_FORM_ID} onSubmit={handleSubmit} noValidate>
          <AuthFormFields>
            {signedInEmail ? (
              <AuthLockedField id={RESET_EMAIL_INPUT_ID} name="email" autoComplete="email" label="Email" value={signedInEmail} />
            ) : sent ? (
              <AuthLockedField id={RESET_USERNAME_INPUT_ID} name="username" autoComplete="username" label="Username" value={username} />
            ) : (
              <AuthAccountField label="Username" htmlFor={RESET_USERNAME_INPUT_ID} invalid={invalid}>
                <input
                  id={RESET_USERNAME_INPUT_ID}
                  name="username"
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  value={username}
                  aria-invalid={invalid || undefined}
                  readOnly={isSending}
                  className={AUTH_ACCOUNT_INPUT_CLASS_NAME}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setInvalid(false);
                  }}
                />
              </AuthAccountField>
            )}
          </AuthFormFields>
          <AuthNoticeSlot notice={notice} />
        </AuthForm>
      </AuthBody>
      <AuthLinks>
        {signedInEmail ? (
          <AuthLink href="/settings">Back to account</AuthLink>
        ) : onBackToSignIn ? (
          <AuthLinkButton onClick={onBackToSignIn}>Sign in</AuthLinkButton>
        ) : (
          <AuthLink href={returnTo ? { pathname: "/login", query: { returnTo } } : "/login"}>Sign in</AuthLink>
        )}
      </AuthLinks>
      <AuthLegalRow returnTo={returnTo} />
      <AuthDockButton
        type="submit"
        form={RESET_FORM_ID}
        busy={isSending}
        busyLabel="Sending…"
        disabled={cooldown > 0 || (!signedInEmail && !username.trim())}
      >
        {dockLabel}
      </AuthDockButton>
    </AuthShell>
  );
}
