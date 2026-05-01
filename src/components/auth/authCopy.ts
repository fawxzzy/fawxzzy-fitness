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
    eyebrow: "",
    title: "Welcome",
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
    title: "Create account",
    subtitle: "Choose your username, email, and password.",
  },
};

export const PASSWORD_LOGIN_UI_COPY: PasswordLoginUiCopy = {
  wordmark: "Fawxzzy Fitness",
  helper: {
    default: "",
    remembered: "Continue with this account to log in.",
    reauth: "Your session ended. Enter your password to continue.",
    emailValid: "",
    ready: "",
  },
  cta: {
    idle: "Enter Gym",
    continue: "Continue",
    ready: "Enter Gym",
    reauth: "Continue",
    pending: "Entering...",
    restoring: "Restoring session...",
  },
  returningUserLabel: "Account",
  switchAction: "Switch account",
  forgotPassword: "Reset password",
  createAccountPrefix: "",
  createAccountAction: "Create account",
};
