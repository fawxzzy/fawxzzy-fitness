import { PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import { LOGIN_INFO_COPY, resolveLoginErrorCopy, resolveLoginInfoCopy } from "@/lib/auth-route-feedback";
import { isUsernameIdentifier } from "@/lib/username-policy";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function shouldStartCredentialStepOpenForLogin(args: { error?: string; requiresReauth?: boolean }) {
  return Boolean(args.requiresReauth || args.error);
}

export function resolveLoginRouteMessages(args: {
  errorCode?: string | null;
  infoCode?: string | null;
  verified?: string | null;
}) {
  // Codes only: unknown `error` / `info` values resolve to nothing (see auth-route-feedback.ts).
  const error = resolveLoginErrorCopy(args.errorCode);
  const requiresReauth = args.errorCode === "session_expired";
  const info =
    args.verified === "1"
      ? LOGIN_INFO_COPY.confirmed
      : args.infoCode === "magic_link_sent"
        ? PASSWORD_LOGIN_UI_COPY.helper.default ?? undefined
        : resolveLoginInfoCopy(args.infoCode);

  return {
    error,
    info,
    requiresReauth,
  };
}

export function getAuthoritativeLoginEmail(args: {
  email: string;
  rememberedEmail?: string | null;
  showEmailField: boolean;
}) {
  if (!args.showEmailField && args.rememberedEmail) {
    return args.rememberedEmail;
  }

  return args.email;
}

export function getSyncedLoginFieldState(args: {
  emailInputValue?: string | null;
  passwordInputValue?: string | null;
  rememberedEmail?: string | null;
  showEmailField: boolean;
}) {
  return {
    email: args.showEmailField ? (args.emailInputValue ?? "") : (args.rememberedEmail ?? args.emailInputValue ?? ""),
    password: args.passwordInputValue ?? "",
  };
}

export function getLoginHelperText(args: { requiresReauth?: boolean }) {
  return args.requiresReauth ? PASSWORD_LOGIN_UI_COPY.helper.reauth : PASSWORD_LOGIN_UI_COPY.helper.default || null;
}

export function getLoginSubmitLabel(args: {
  formReady: boolean;
  isExceptionalReauth: boolean;
  isSubmitting: boolean;
}) {
  if (args.isSubmitting) {
    return PASSWORD_LOGIN_UI_COPY.cta.pending;
  }

  if (args.formReady) {
    return PASSWORD_LOGIN_UI_COPY.cta.ready;
  }

  return PASSWORD_LOGIN_UI_COPY.cta.idle;
}

export function getLoginScreenViewState(args: {
  email: string;
  password: string;
  isSubmitting: boolean;
  requiresReauth?: boolean;
}) {
  const showManualAuth = true;
  const showEmailField = true;
  const effectiveEmail = getAuthoritativeLoginEmail({
    email: args.email,
    rememberedEmail: null,
    showEmailField,
  });
  const emailValid = EMAIL_PATTERN.test(normalizeEmail(effectiveEmail)) || isUsernameIdentifier(effectiveEmail);
  const passwordValid = args.password.length >= 6;
  const formReady = emailValid && passwordValid;

  return {
    emailValid,
    passwordValid,
    formReady,
    showManualAuth,
    showEmailField,
    helperText: getLoginHelperText({
      requiresReauth: args.requiresReauth,
    }),
    submitLabel: getLoginSubmitLabel({
      formReady,
      isExceptionalReauth: Boolean(args.requiresReauth),
      isSubmitting: args.isSubmitting,
    }),
  };
}
