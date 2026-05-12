import { resolveLoginRouteMessages } from "@/app/login/loginScreenState";
import { LoginScreen } from "@/app/login/LoginScreen";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    verified?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
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
