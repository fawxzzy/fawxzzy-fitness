export type AuthMode = "password-login" | "magic-link" | "reset-password" | "create-account";

export type AuthModeCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  helper?: string;
};

export const AUTH_MODE_COPY: Record<AuthMode, AuthModeCopy> = {
  "password-login": {
    eyebrow: "Welcome back",
    title: "Log in to your training app",
    subtitle: "Use your email and password to get back to your routines and workouts.",
    helper: "Use the Forgot password link below if you need a reset email.",
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
