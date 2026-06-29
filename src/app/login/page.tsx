import { redirect } from "next/navigation";
import type { LocalDevAutoLoginAccount } from "@/lib/local-dev-auto-entry";
import { getLocalDevAutoLoginCredentials } from "@/lib/local-dev-auto-entry";
import { resolveLoginRouteMessages } from "@/app/login/loginScreenState";
import { LoginScreen } from "@/app/login/LoginScreen";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    localAutoAuth?: string;
    localAccount?: string;
    manual?: string;
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
  const shouldAttemptLocalDevAutoLogin = searchParams?.manual !== "1" && searchParams?.localAutoAuth !== "failed";

  if (shouldAttemptLocalDevAutoLogin) {
    const preferredAccount = resolvePreferredLocalDevAccount(searchParams?.localAccount);
    const localDevCredentials = getLocalDevAutoLoginCredentials(preferredAccount);

    if (localDevCredentials) {
      const authHref = preferredAccount
        ? `/auth/local-dev-auto-login?account=${preferredAccount}`
        : "/auth/local-dev-auto-login";
      redirect(authHref);
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
    />
  );
}
