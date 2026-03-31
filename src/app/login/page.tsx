import { LoginScreen } from "@/app/login/LoginScreen";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";

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

  const infoCode = searchParams?.info;
  const info =
    searchParams?.verified === "1" || infoCode === "confirmed"
      ? "Email verified. You can log in now."
      : infoCode === "magic_link_sent"
        ? AUTH_MODE_COPY["magic-link"].helper
        : infoCode;

  return <LoginScreen error={error} info={info} />;
}
