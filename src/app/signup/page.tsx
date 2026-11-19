import { SignupForm } from "@/components/auth/SignupForm";
import { resolveSignupRouteMessages } from "@/components/auth/signupFeedback";

export const dynamic = "force-dynamic";

// `error` and `info` carry allow-listed codes (see signupFeedback.ts), never display text.
type SignupPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    info?: string | string[];
  }>;
};

export default async function SignupPage(props: SignupPageProps) {
  const searchParams = await props.searchParams;
  const routeMessages = resolveSignupRouteMessages({
    errorCode: searchParams?.error,
    infoCode: searchParams?.info,
  });

  return <SignupForm error={routeMessages.error} info={routeMessages.info} />;
}
