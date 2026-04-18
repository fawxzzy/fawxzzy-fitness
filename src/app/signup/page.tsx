import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const copy = AUTH_MODE_COPY["create-account"];

  return (
    <AuthShell>
      <AuthIntro eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />
      <SignupForm error={searchParams?.error} info={searchParams?.info} />
    </AuthShell>
  );
}
