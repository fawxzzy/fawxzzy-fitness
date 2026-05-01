import Link from "next/link";
import { notFound } from "next/navigation";
import { LoginScreen } from "@/app/login/LoginScreen";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthCard, AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { RouteLoading } from "@/components/RouteLoading";
import { appTokens } from "@/components/ui/app/tokens";

export const dynamic = "force-dynamic";

type AuthScreenLabPageProps = {
  searchParams?: {
    screen?: string;
  };
};

const screens = [
  { id: "login", label: "Login" },
  { id: "login-remembered", label: "Login remembered account" },
  { id: "login-remembered-password", label: "Login remembered password" },
  { id: "login-remembered-reauth", label: "Login remembered reauth" },
  { id: "signup", label: "Create account" },
  { id: "reset-password-linking", label: "Reset linking" },
  { id: "loading-boot", label: "Boot loading" },
  { id: "loading-route", label: "Route loading" },
  { id: "entry-handoff", label: "Entry handoff" },
  { id: "entry-handoff-error", label: "Entry handoff error" },
  { id: "curated-restore-loading", label: "Curated restore loading" },
] as const;

type ScreenId = (typeof screens)[number]["id"];

function isScreenId(value: string | undefined): value is ScreenId {
  return screens.some((screen) => screen.id === value);
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
  displayName: "Atlas",
  sessionState: "reauth-required" as const,
  updatedAt: "2026-04-23T16:00:00.000Z",
};

export default function AuthScreenLabPage({ searchParams }: AuthScreenLabPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  if (!isScreenId(searchParams?.screen)) {
    return <ScreenPicker />;
  }

  if (searchParams.screen === "login") {
    return <LoginScreen />;
  }

  if (searchParams.screen === "login-remembered") {
    return <LoginScreen previewRememberedLogin={previewRememberedLogin} />;
  }

  if (searchParams.screen === "login-remembered-password") {
    return (
      <LoginScreen
        previewRememberedLogin={previewRememberedLogin}
        previewShowCredentialStep
      />
    );
  }

  if (searchParams.screen === "login-remembered-reauth") {
    return (
      <LoginScreen
        previewRememberedLogin={previewRememberedLogin}
        previewShowCredentialStep
        requiresReauth
      />
    );
  }

  if (searchParams.screen === "signup") {
    return (
      <AuthShell>
        <SignupForm />
      </AuthShell>
    );
  }

  if (searchParams.screen === "reset-password-linking") {
    return <RouteLoading label="Finishing your password reset link..." variant="route" />;
  }

  if (searchParams.screen === "loading-boot") {
    return (
      <RouteLoading
        label="Opening FawxzzyFitness"
        detail="Preparing your start screen."
        variant="boot"
      />
    );
  }

  if (searchParams.screen === "entry-handoff") {
    return <RouteLoading label="Checking where to drop you in." variant="route" />;
  }

  if (searchParams.screen === "entry-handoff-error") {
    return (
      <AuthShell>
        <AuthCard className={appTokens.authInteractiveCard} data-testid="initial-experience-gate-error-preview">
          <AuthIntro eyebrow="" title="" subtitle="" />
          <p className="pt-2 text-center text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">
            Could not open app.
          </p>
        </AuthCard>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <BottomActionSplit
            secondary={<BottomDockButton type="button" intent="info">Retry</BottomDockButton>}
            primary={<BottomDockLink href="/today" intent="positive">Start Offline</BottomDockLink>}
          />
        </div>
      </AuthShell>
    );
  }

  if (searchParams.screen === "curated-restore-loading") {
    return <RouteLoading label="Restoring your training setup" variant="route" />;
  }

  return <RouteLoading label="Loading..." variant="route" />;
}
