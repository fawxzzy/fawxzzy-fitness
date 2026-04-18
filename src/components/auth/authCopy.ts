export type AuthMode = "password-login" | "magic-link" | "reset-password" | "create-account";

export type AuthModeCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  helper?: string;
};

export type PasswordLoginUiCopy = {
  wordmark: string;
  helper: {
    default: string;
    remembered: string;
    reauth: string;
    emailValid: string;
    ready: string;
  };
  cta: {
    idle: string;
    continue: string;
    ready: string;
    reauth: string;
    pending: string;
    restoring: string;
  };
  returningUserLabel: string;
  switchAction: string;
  forgotPassword: string;
  createAccountPrefix: string;
  createAccountAction: string;
};

export const AUTH_MODE_COPY: Record<AuthMode, AuthModeCopy> = {
  "password-login": {
    eyebrow: "Training space",
    title: "Welcome back",
    subtitle: "",
    helper: "Use Forgot password if you need a reset email.",
  },
  "magic-link": {
    eyebrow: "Check your inbox",
    title: "Use your email link",
    subtitle: "Open the sign-in link from your email to continue this session.",
    helper: "If you do not see the email, check spam, promotions, or junk folders.",
  },
  "reset-password": {
    eyebrow: "Password recovery",
    title: "Reset your password",
    subtitle: "Request a reset email and set a new password from the recovery link.",
    helper: "For security, you can request a new reset link once per minute.",
  },
  "create-account": {
    eyebrow: "Get started",
    title: "Create your account",
    subtitle: "Create your login to start tracking routines, workouts, and progression.",
  },
};

export const PASSWORD_LOGIN_UI_COPY: PasswordLoginUiCopy = {
  wordmark: "Fawxzzy Fitness",
  helper: {
    default: "Log in to continue your routine",
    remembered: "Enter Gym to restore your session.",
    reauth: "Session refresh failed. Re-enter your password to continue.",
    emailValid: "Good. Now unlock your session",
    ready: "",
  },
  cta: {
    idle: "Start",
    continue: "Continue",
    ready: "Enter Gym",
    reauth: "Re-enter password",
    pending: "Entering Gym...",
    restoring: "Restoring session...",
  },
  returningUserLabel: "Returning member",
  switchAction: "Switch account",
  forgotPassword: "Forgot password?",
  createAccountPrefix: "New here?",
  createAccountAction: "Create account",
};
