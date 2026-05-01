import { PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,14}$/i;

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
  const error =
    args.errorCode === "confirm_failed"
      ? "Could not verify your link. Please request a new one."
      : args.errorCode === "recovery_session_missing"
        ? "Your reset link expired. Please request a new one."
        : args.errorCode === "rate_limited"
          ? "Too many reset requests. Please wait a few minutes and try again."
          : args.errorCode === "send_failed"
            ? "Could not send reset email. Please try again in a few minutes."
        : args.errorCode === "session_expired"
          ? "Session refresh failed. Re-enter your password to continue."
          : args.errorCode ?? undefined;
  const requiresReauth = args.errorCode === "session_expired";
  const info =
    args.verified === "1" || args.infoCode === "confirmed"
      ? "Email verified. You can log in now."
      : args.infoCode === "reset_requested"
        ? "Reset email sent. Check your inbox."
      : args.infoCode === "magic_link_sent"
        ? PASSWORD_LOGIN_UI_COPY.helper.default ?? undefined
        : args.infoCode ?? undefined;

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

export function getRememberedAccountPromptState(args: {
  hasRememberedAccount: boolean;
  showCredentialStep: boolean;
}) {
  if (!args.hasRememberedAccount || args.showCredentialStep) {
    return null;
  }

  return {
    action: "reveal-credentials" as const,
    label: PASSWORD_LOGIN_UI_COPY.cta.continue,
  };
}

export function getLoginHelperText(args: {
  hasRememberedAccount: boolean;
  showCredentialStep: boolean;
  requiresReauth?: boolean;
}) {
  if (args.hasRememberedAccount && !args.showCredentialStep) {
    return PASSWORD_LOGIN_UI_COPY.helper.remembered;
  }

  if (PASSWORD_LOGIN_UI_COPY.helper.default) {
    return PASSWORD_LOGIN_UI_COPY.helper.default;
  }

  return null;
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
  rememberedEmail?: string | null;
  hasHydrated: boolean;
  showCredentialStep: boolean;
  isSubmitting: boolean;
  requiresReauth?: boolean;
}) {
  const hasRememberedAccount = args.hasHydrated && Boolean(args.rememberedEmail);
  const showRememberedAccountCard = hasRememberedAccount;
  const showManualAuth = args.showCredentialStep || !hasRememberedAccount;
  const showEmailField = !hasRememberedAccount;
  const effectiveEmail = getAuthoritativeLoginEmail({
    email: args.email,
    rememberedEmail: args.rememberedEmail,
    showEmailField,
  });
  const emailValid = EMAIL_PATTERN.test(normalizeEmail(effectiveEmail)) || USERNAME_PATTERN.test(effectiveEmail.trim());
  const passwordValid = args.password.length >= 6;
  const formReady = emailValid && passwordValid;

  return {
    emailValid,
    passwordValid,
    formReady,
    showRememberedAccountCard,
    showManualAuth,
    showEmailField,
    showReadonlyRememberedAccount: showManualAuth && !showEmailField && !showRememberedAccountCard,
    rememberedAccountPrompt: getRememberedAccountPromptState({
      hasRememberedAccount: showRememberedAccountCard,
      showCredentialStep: args.showCredentialStep,
    }),
    helperText: getLoginHelperText({
      hasRememberedAccount,
      showCredentialStep: args.showCredentialStep,
      requiresReauth: args.requiresReauth,
    }),
    submitLabel: getLoginSubmitLabel({
      formReady,
      isExceptionalReauth: Boolean(args.requiresReauth),
      isSubmitting: args.isSubmitting,
    }),
  };
}
