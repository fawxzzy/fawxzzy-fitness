"use client";

import Link from "next/link";
import { login } from "@/app/auth/actions";
import { InstallGuidance } from "@/components/auth/InstallGuidance";
import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthCard, AuthField, AuthFooter, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";
import { useInstallContext } from "@/hooks/useInstallContext";

export function LoginScreen({ error, info }: { error?: string; info?: string }) {
  const { isBrowserMode, isDismissed } = useInstallContext();
  const showInstallGate = isBrowserMode && !isDismissed;
  const copy = AUTH_MODE_COPY["password-login"];

  return (
    <AuthShell>
      <AuthIntro eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      {showInstallGate ? (
        <InstallGuidance mode="gate" />
      ) : (
        <AuthCard>
          <form action={login} className="space-y-5">
            <div className="space-y-4">
              <AuthField label="Email">
                <Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
              </AuthField>
              <AuthField label="Password">
                <Input type="password" name="password" minLength={6} required autoComplete="current-password" placeholder="Enter your password" />
              </AuthField>
            </div>

            {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
            {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}

            <div className="space-y-3">
              <PrimaryButton type="submit" fullWidth>
                Log in
              </PrimaryButton>
            </div>
          </form>

          <AuthFooter>
            <Link className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-medium text-slate-100 transition hover:bg-white/10" href="/signup">
              Create account
            </Link>
            <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <Link className="font-medium text-accent underline-offset-4 hover:underline" href="/forgot-password">
                Forgot password?
              </Link>
              {copy.helper ? <p className="text-xs leading-5 text-slate-500">{copy.helper}</p> : null}
            </div>
          </AuthFooter>
        </AuthCard>
      )}
    </AuthShell>
  );
}
