import Link from "next/link";
import { notFound } from "next/navigation";
import { LoginScreen } from "@/app/login/LoginScreen";
import { AccountPortalRedirect } from "@/app/login/AccountPortalRedirect";
import NotFound from "@/app/not-found";
import { AccountScreen } from "@/components/account/AccountScreen";
import ForgotPasswordFormClient from "@/app/forgot-password/ForgotPasswordFormClient";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { authNotice } from "@/components/auth/authMessages";
import { AppRecoveryScreen } from "@/components/error/AppRecoveryScreen";
import { AppSoftErrorBoundary } from "@/components/error/AppSoftErrorBoundary";
import { InstallScreen } from "@/components/install/InstallGateChrome";
import { InstallRouteSurface } from "@/components/install/InstallRouteSurface";
import { AuthDockButton, AuthLink, AuthLinks, AuthStatusScreen } from "@/components/auth/AuthShell";
import { RouteLoading } from "@/components/RouteLoading";

export const dynamic = "force-dynamic";

type AuthScreenLabPageProps = {
  searchParams?: Promise<{
    screen?: string;
  }>;
};

const screens = [
  { id: "login", label: "Login" },
  { id: "login-busy", label: "Login working" },
  { id: "login-empty", label: "Login empty submit" },
  { id: "login-wrong", label: "Login wrong details" },
  { id: "login-confirmed", label: "Login after email confirmed" },
  { id: "account", label: "Signed-in account" },
  { id: "login-remembered", label: "Login remembered account" },
  { id: "login-remembered-password", label: "Login remembered password" },
  { id: "login-remembered-reauth", label: "Login remembered reauth" },
  { id: "signup", label: "Create account" },
  { id: "signup-taken", label: "Create account, username taken" },
  { id: "signup-email-exists", label: "Create account, email already has an account" },
  { id: "signup-sent", label: "Create account, check your email" },
  { id: "forgot-password", label: "Reset password request" },
  { id: "forgot-password-signed-in", label: "Reset password request, signed in" },
  { id: "forgot-password-sent", label: "Reset link sent" },
  { id: "forgot-password-sent-signed-in", label: "Reset link sent, signed in" },
  { id: "reset-password", label: "Set new password" },
  { id: "reset-password-mismatch", label: "Set new password, mismatch" },
  { id: "reset-password-expired", label: "Expired reset callback" },
  { id: "install", label: "Install (this browser)" },
  { id: "install-ios-safari", label: "Install, iPhone Safari" },
  { id: "install-ios-inapp", label: "Install, iPhone in-app browser" },
  { id: "install-prompt", label: "Install, prompt ready" },
  { id: "install-manual", label: "Install, manual" },
  { id: "install-desktop", label: "Install, computer (Chrome or Edge)" },
  { id: "install-desktop-safari", label: "Install, computer (Safari)" },
  { id: "install-unsupported", label: "Install, unsupported browser" },
  { id: "install-installed", label: "Install, installed" },
  { id: "reset-password-linking", label: "Reset linking" },
  { id: "portal-redirect", label: "Account portal hand-off" },
  { id: "loading-boot", label: "Boot loading" },
  { id: "loading-route", label: "Route loading" },
  { id: "entry-handoff", label: "Entry handoff" },
  { id: "entry-handoff-error", label: "Entry handoff error" },
  { id: "app-recovery", label: "Could not load" },
  { id: "soft-recovery", label: "Could not load, in-app card" },
  { id: "global-error", label: "App could not finish loading" },
  { id: "not-found", label: "Page not found" },
  { id: "curated-restore-loading", label: "Curated restore loading" },
] as const;

type ScreenId = (typeof screens)[number]["id"];

function isScreenId(value: string | undefined): value is ScreenId {
  return screens.some((screen) => screen.id === value);
}

function ThrowOnRender(): never {
  throw new Error("Lab preview of the in-app error card");
}

function ScreenPicker() {
  return (
    <main className="min-h-[100dvh] bg-[rgb(var(--bg-app))] px-4 py-6 text-[rgb(var(--text))]">
      <div className="mx-auto max-w-md space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgb(var(--text-muted)/0.8)]">Auth Screen Lab</p>
          <h1 className="text-2xl font-semibold">Pick a preview</h1>
          <p className="text-sm leading-6 text-[rgb(var(--text-muted)/0.92)]">
            Dev-only launcher for hard-to-reach auth states.
          </p>
        </div>
        <div className="grid gap-2">
          {screens.map((screen) => (
            <Link
              key={screen.id}
              href={`/dev/auth-screen-lab?screen=${screen.id}`}
              className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-white/[0.08]"
            >
              {screen.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

const previewRememberedLogin = {
  email: "atlas@example.com",
  displayName: "atlas",
  sessionState: "reauth-required" as const,
  updatedAt: "2026-04-23T16:00:00.000Z",
};

const PREVIEW_SIGNED_IN_EMAIL = "atlas@example.com";

export default async function AuthScreenLabPage(props: AuthScreenLabPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const searchParams = await props.searchParams;

  if (!isScreenId(searchParams?.screen)) {
    return <ScreenPicker />;
  }

  switch (searchParams.screen) {
    case "login":
      return <LoginScreen />;
    case "login-busy":
      return <LoginScreen previewBusy />;
    case "login-empty":
      return <LoginScreen previewNotice="signin.empty" />;
    case "login-wrong":
      return <LoginScreen previewNotice="signin.wrong" />;
    case "login-confirmed":
      return <LoginScreen previewNotice="signin.confirmed" />;
    case "account":
      return (
        <AccountScreen
          email="atlas.qa@example.com"
          username="Atlas QA"
          returnHref="/settings"
        />
      );
    case "login-remembered":
      return <LoginScreen previewRememberedLogin={previewRememberedLogin} />;
    case "login-remembered-password":
      return <LoginScreen previewRememberedLogin={previewRememberedLogin} previewShowCredentialStep />;
    case "login-remembered-reauth":
      return <LoginScreen previewRememberedLogin={previewRememberedLogin} previewShowCredentialStep requiresReauth />;
    case "signup":
      return <SignupForm />;
    case "signup-taken":
      return <SignupForm previewNotice="signup.taken" />;
    case "signup-email-exists":
      return <SignupForm previewNotice="signup.emailexists" />;
    case "signup-sent":
      return <SignupForm previewSent={{ username: "atlas", email: PREVIEW_SIGNED_IN_EMAIL }} />;
    case "forgot-password":
      return <ForgotPasswordFormClient />;
    case "forgot-password-signed-in":
      return <ForgotPasswordFormClient signedInEmail={PREVIEW_SIGNED_IN_EMAIL} />;
    case "forgot-password-sent":
      return <ForgotPasswordFormClient initialUsername="atlas" previewSent />;
    case "forgot-password-sent-signed-in":
      return <ForgotPasswordFormClient signedInEmail={PREVIEW_SIGNED_IN_EMAIL} previewSent />;
    case "reset-password":
      return <ResetPasswordForm />;
    case "reset-password-mismatch":
      return <ResetPasswordForm previewNotice="reset.mismatch" />;
    case "reset-password-expired":
      return <ForgotPasswordFormClient initialNotice={authNotice("reset.expired")} />;
    case "install":
      return <InstallRouteSurface initialInstallContext="other" initialReturnTo="/today" />;
    case "install-ios-safari":
      return <InstallScreen kind="ios-safari" />;
    case "install-ios-inapp":
      return <InstallScreen kind="ios-inapp" />;
    case "install-prompt":
      return <InstallScreen kind="prompt" />;
    case "install-manual":
      return <InstallScreen kind="manual" />;
    case "install-desktop":
      return <InstallScreen kind="desktop" />;
    case "install-desktop-safari":
      return <InstallScreen kind="desktop-safari" />;
    case "install-unsupported":
      return <InstallScreen kind="unsupported" />;
    case "install-installed":
      return <InstallScreen kind="installed" />;
    case "reset-password-linking":
      return <AuthStatusScreen title="Signing you in…" working testId="recovery-session-pending" />;
    case "portal-redirect":
      // A same-page hash, so the preview stays put while showing the hand-off screen (fallback link after 6 s).
      return <AccountPortalRedirect href="#portal-preview" />;
    case "loading-boot":
      return <RouteLoading label="Opening Fitness…" variant="boot" />;
    case "loading-route":
      return <RouteLoading label="Loading…" variant="route" />;
    case "entry-handoff":
      return <RouteLoading label="Checking your account…" variant="route" />;
    case "entry-handoff-error":
      return (
        <AuthStatusScreen
          testId="initial-experience-gate-error-preview"
          title="Could not load"
          notice={authNotice("page.crash")}
          action={(
            <>
              <AuthLinks>
                <AuthLink href="/today">Go to Today</AuthLink>
              </AuthLinks>
              <AuthDockButton type="button">Try again</AuthDockButton>
            </>
          )}
        />
      );
    case "app-recovery":
      return <AppRecoveryScreen errorName="LabPreview" />;
    case "soft-recovery":
      return <AppSoftErrorBoundary><ThrowOnRender /></AppSoftErrorBoundary>;
    case "global-error":
      return <AppRecoveryScreen errorName="LabPreview" />;
    case "not-found":
      return <NotFound />;
    case "curated-restore-loading":
      return <RouteLoading label="Restoring your training setup…" variant="route" />;
    default:
      return <RouteLoading label="Loading…" variant="route" />;
  }
}
