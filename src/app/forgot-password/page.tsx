import ForgotPasswordFormClient from "@/app/forgot-password/ForgotPasswordFormClient";

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
  };
};

function getErrorMessage(errorCode: string | undefined) {
  if (errorCode === "rate_limited") {
    return "Too many reset requests. Please wait a few minutes and try again.";
  }

  if (errorCode) {
    return "Could not send reset email. Please try again in a few minutes.";
  }

  return null;
}

function getInfoMessage(infoCode: string | undefined) {
  if (infoCode === "reset_requested") {
    return "If that email is registered, you’ll receive a reset link shortly. Check spam/promotions.";
  }

  return null;
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const errorMessage = getErrorMessage(searchParams?.error);
  const infoMessage = getInfoMessage(searchParams?.info);
  const shouldStartCooldown = searchParams?.info === "reset_requested";

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">
      <ForgotPasswordFormClient
        errorMessage={errorMessage}
        infoMessage={infoMessage}
        shouldStartCooldown={shouldStartCooldown}
      />
    </main>
  );
}
