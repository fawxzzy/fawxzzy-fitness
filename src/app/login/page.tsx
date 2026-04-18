import { redirect } from "next/navigation";
import { LoginScreen } from "@/app/login/LoginScreen";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    verified?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/entry");
  }

  const errorCode = searchParams?.error;
  const error =
    errorCode === "confirm_failed"
      ? "Could not verify your link. Please request a new one."
      : errorCode === "recovery_session_missing"
        ? "Your reset link expired. Please request a new one."
        : errorCode === "session_expired"
          ? "Session refresh failed. Re-enter your password to continue."
        : errorCode;
  const requiresReauth = errorCode === "session_expired";

  const infoCode = searchParams?.info;
  const info =
    searchParams?.verified === "1" || infoCode === "confirmed"
      ? "Email verified. You can log in now."
      : infoCode === "magic_link_sent"
        ? AUTH_MODE_COPY["magic-link"].helper
        : infoCode;

  return <LoginScreen error={error} info={info} requiresReauth={requiresReauth} />;
}
