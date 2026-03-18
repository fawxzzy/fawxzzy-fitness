import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { AuthCard, AuthField, AuthFooter, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";

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
      <AuthIntro
        eyebrow="Get started"
        title="Create your account"
        subtitle="Set up your account in the browser when needed, then jump back into the installed app shell for the best day-to-day experience."
      />

      <AuthCard>
        <form action={signup} className="space-y-5">
          <div className="space-y-4">
            <AuthField label="Email">
              <Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
            </AuthField>
            <AuthField label="Password">
              <Input type="password" name="password" minLength={6} required autoComplete="new-password" placeholder="Create a password" />
            </AuthField>
          </div>

          {searchParams?.error ? <AuthMessage tone="error">{searchParams.error}</AuthMessage> : null}
          {searchParams?.info ? <AuthMessage tone="success">{searchParams.info}</AuthMessage> : null}

          <PrimaryButton type="submit" fullWidth>
            Sign up
          </PrimaryButton>
        </form>

        <AuthFooter>
          <p className="text-center leading-6 text-slate-300">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
