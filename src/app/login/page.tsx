import { LoginScreen } from "@/app/login/LoginScreen";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    verified?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorCode = searchParams?.error;
  const error =
    errorCode === "confirm_failed"
      ? "Could not verify your link. Please request a new one."
      : errorCode === "recovery_session_missing"
        ? "Your reset link expired. Please request a new one."
        : errorCode;

  const info =
    searchParams?.verified === "1" || searchParams?.info === "confirmed"
      ? "Email verified. You can log in now."
      : searchParams?.info;

  return <LoginScreen error={error} info={info} />;
}
