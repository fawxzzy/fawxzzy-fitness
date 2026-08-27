import type { LocalDevAutoLoginAccount } from "@/lib/local-dev-auto-entry";
import {
  getLocalDevAutoLoginCredentials,
  isTrustedLocalDevRequest,
} from "@/lib/local-dev-auto-entry";
import { isSafeAppPath } from "@/lib/navigation-return";
import { redirect } from "next/navigation";
import { AccountPortalRedirect } from "@/app/login/AccountPortalRedirect";
import { LocalDevAutoLoginRedirect } from "@/app/login/LocalDevAutoLoginRedirect";
import { LoginScreen } from "@/app/login/LoginScreen";
import { resolveLoginRouteMessages } from "@/app/login/loginScreenState";
import { getFitnessAccountPortalUrl } from "@/lib/account-portal";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    localAutoAuth?: string;
    localAccount?: string;
    manual?: string;
    returnTo?: string;
    installedApp?: string;
    verified?: string;
  };
};

function resolvePreferredLocalDevAccount(value: string | undefined): LocalDevAutoLoginAccount | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "qa" || normalized === "zac") {
    return normalized;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const shouldAttemptLocalDevAutoLogin = searchParams?.localAutoAuth === "1";
  const returnTo = isSafeAppPath(searchParams?.returnTo) ? searchParams.returnTo : undefined;

  // Home Screen installs created before the manifest start URL moved to /entry
  // still launch /login?installedApp=1. Redirect before LoginScreen mounts: it
  // intentionally clears browser and mirrored server sessions for true reauth.
  const isLegacyInstalledAppLaunch =
    searchParams?.installedApp === "1" &&
    !searchParams?.error &&
    !searchParams?.info &&
    !searchParams?.verified &&
    !returnTo &&
    !shouldAttemptLocalDevAutoLogin;

  if (isLegacyInstalledAppLaunch) {
    redirect("/entry?installedApp=1");
  }

  if (shouldAttemptLocalDevAutoLogin) {
    const preferredAccount = resolvePreferredLocalDevAccount(searchParams?.localAccount);
    const localDevCredentials = getLocalDevAutoLoginCredentials(preferredAccount);

    if (localDevCredentials) {
      const params = new URLSearchParams();
      if (preferredAccount) {
        params.set("account", preferredAccount);
      }
      if (returnTo) {
        params.set("returnTo", returnTo);
      }
      const href = params.size > 0
        ? `/auth/local-dev-auto-login?${params.toString()}`
        : "/auth/local-dev-auto-login";
      return <LocalDevAutoLoginRedirect href={href} />;
    }
  }

  const shouldRenderLocalManualLogin =
    isTrustedLocalDevRequest() &&
    (searchParams?.manual === "1" || searchParams?.localAutoAuth === "failed");

  if (shouldRenderLocalManualLogin) {
    const routeState = resolveLoginRouteMessages({
      errorCode: searchParams?.error,
      infoCode: searchParams?.info,
      verified: searchParams?.verified,
    });

    return (
      <LoginScreen
        error={routeState.error}
        info={routeState.info}
        requiresReauth={routeState.requiresReauth}
        returnTo={returnTo}
      />
    );
  }

  return <AccountPortalRedirect href={getFitnessAccountPortalUrl("/login", returnTo)} />;
}
