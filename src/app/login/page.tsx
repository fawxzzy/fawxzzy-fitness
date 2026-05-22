import { redirect } from "next/navigation";
import { getLocalDevAutoLoginCredentials } from "@/lib/local-dev-auto-entry";
import { resolveLoginRouteMessages } from "@/app/login/loginScreenState";
import { LoginScreen } from "@/app/login/LoginScreen";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    localAutoAuth?: string;
    manual?: string;
    verified?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const shouldAttemptLocalDevAutoLogin = searchParams?.manual !== "1" && searchParams?.localAutoAuth !== "failed";

  if (shouldAttemptLocalDevAutoLogin) {
    const localDevCredentials = getLocalDevAutoLoginCredentials();

    if (localDevCredentials) {
      redirect("/auth/local-dev-auto-login");
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
