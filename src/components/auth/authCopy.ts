export type AuthMode = "password-login" | "magic-link" | "reset-password" | "create-account";

export type AuthModeCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  helper?: string;
};

export type PasswordLoginUiCopy = {
  wordmark: string;
  progressLabel: string;
  helper: {
    default: string;
    emailValid: string;
    ready: string;
  };
  cta: {
    idle: string;
    ready: string;
    pending: string;
  };
  returningUserLabel: string;
  switchPrompt: string;
  switchAction: string;
  forgotPassword: string;
  createAccountPrefix: string;
  createAccountAction: string;
};

export const AUTH_MODE_COPY: Record<AuthMode, AuthModeCopy> = {
  "password-login": {
    eyebrow: "Training space",
    title: "Welcome back",
    subtitle: "Pick up where you left off.",
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
  progressLabel: "Warm-up",
  helper: {
    default: "Log in to continue your routine",
    emailValid: "Good. Now unlock your session",
    ready: "You're good to go",
  },
  cta: {
    idle: "Start",
    ready: "Enter Gym",
    pending: "Entering Gym...",
  },
  returningUserLabel: "Returning athlete",
  switchPrompt: "Not you?",
  switchAction: "Switch account",
  forgotPassword: "Forgot password?",
  createAccountPrefix: "New here?",
  createAccountAction: "Create account",
};
