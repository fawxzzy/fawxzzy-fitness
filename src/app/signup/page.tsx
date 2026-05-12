import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  return (
    <AuthShell>
      <SignupForm error={searchParams?.error} info={searchParams?.info} />
    </AuthShell>
  );
}
