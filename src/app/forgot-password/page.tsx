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
    return "We just sent a link recently. Please wait a few minutes before trying again.";
  }

  if (errorCode) {
    return "We couldn’t send a reset link right now. Please try again in a few minutes.";
  }

  return null;
}

function getInfoMessage(infoCode: string | undefined) {
  if (infoCode === "reset_requested") {
    return "If an account exists for that email, we sent a reset link. Check spam/junk and try again in a few minutes if it doesn’t arrive.";
  }

  return null;
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const errorMessage = getErrorMessage(searchParams?.error);
  const infoMessage = getInfoMessage(searchParams?.info);
  const shouldStartCooldown = Boolean(searchParams?.error || searchParams?.info);

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
