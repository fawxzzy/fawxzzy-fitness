import { redirect } from "next/navigation";

import type { LocalDevAutoLoginAccount } from "@/lib/local-dev-auto-entry";
import { getInstallRouteHrefForReturnTo, INSTALLED_APP_QUERY_PARAM, INSTALL_BYPASS_QUERY_PARAM } from "@/lib/install/config";
import { getLocalDevAutoLoginCredentials } from "@/lib/local-dev-auto-entry";
import { isSafeAppPath } from "@/lib/navigation-return";
import { resolveLoginRouteMessages } from "@/app/login/loginScreenState";
import { LoginScreen } from "@/app/login/LoginScreen";
import { LocalDevAutoLoginRedirect } from "@/app/login/LocalDevAutoLoginRedirect";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    localAutoAuth?: string;
    localAccount?: string;
    manual?: string;
    returnTo?: string;
    verified?: string;
    [INSTALLED_APP_QUERY_PARAM]?: string;
    [INSTALL_BYPASS_QUERY_PARAM]?: string;
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
  if (searchParams?.[INSTALL_BYPASS_QUERY_PARAM] !== "1" && searchParams?.[INSTALLED_APP_QUERY_PARAM] !== "1") {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (key === INSTALL_BYPASS_QUERY_PARAM || key === INSTALLED_APP_QUERY_PARAM || typeof value !== "string" || !value) {
        continue;
      }
      params.set(key, value);
    }

    const returnToInstallTarget = params.size > 0 ? `/login?${params.toString()}` : "/login";
    redirect(getInstallRouteHrefForReturnTo(returnToInstallTarget));
  }

  const shouldAttemptLocalDevAutoLogin = searchParams?.manual !== "1" && searchParams?.localAutoAuth !== "failed";
  const returnTo = isSafeAppPath(searchParams?.returnTo) ? searchParams.returnTo : undefined;

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
