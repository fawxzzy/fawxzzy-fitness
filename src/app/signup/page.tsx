import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { resolveSignupRouteMessages } from "@/components/auth/signupFeedback";

export const dynamic = "force-dynamic";

// `error` and `info` carry allow-listed codes (see signupFeedback.ts), never display text.
type SignupPageProps = {
  searchParams?: {
    error?: string | string[];
    info?: string | string[];
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const copy = AUTH_MODE_COPY["create-account"];
  const routeMessages = resolveSignupRouteMessages({
    errorCode: searchParams?.error,
    infoCode: searchParams?.info,
  });

  return (
    <AuthShell
      header={<AuthIntro eyebrow="" title={copy.title} subtitle={copy.subtitle} />}
    >
      <SignupForm error={routeMessages.error} info={routeMessages.info} />
    </AuthShell>
  );
}
