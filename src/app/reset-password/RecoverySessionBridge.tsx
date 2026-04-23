"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { establishRecoverySession } from "@/app/reset-password/actions";
import { AuthDock, AuthFooter, AuthFooterText, AuthStack } from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { RouteLoading } from "@/components/RouteLoading";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/client";

const RECOVERY_SESSION_ERROR = "Reset link expired.";

type RecoverySessionBridgeProps = {
  initialError?: string;
};

export function RecoverySessionBridge({ initialError }: RecoverySessionBridgeProps) {
  const [error, setError] = useState(initialError ?? null);
  const [isPending, setIsPending] = useState(!initialError);

  useEffect(() => {
    if (initialError) {
      return;
    }

    let cancelled = false;

    const syncRecoverySession = async (session: Session | null) => {
      if (!session || cancelled) {
        return false;
      }

      const result = await establishRecoverySession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      if (cancelled) {
        return true;
      }

      if (!result.ok) {
        setError(result.error);
        setIsPending(false);
        return true;
      }

      window.location.replace("/reset-password");
      return true;
    };

    const finishRecovery = async () => {
      const recoveryHash = window.location.hash;
      const hasRecoveryFragment =
        recoveryHash.includes("access_token=") || recoveryHash.includes("refresh_token=") || recoveryHash.includes("type=recovery");

      if (!hasRecoveryFragment) {
        setError(RECOVERY_SESSION_ERROR);
        setIsPending(false);
        return;
      }

      const supabase = createBrowserSupabase();

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          if (!cancelled) {
            setError(RECOVERY_SESSION_ERROR);
            setIsPending(false);
          }
          return;
        }

        if (await syncRecoverySession(data.session)) {
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }

      if (!cancelled) {
        setError(RECOVERY_SESSION_ERROR);
        setIsPending(false);
      }
    };

    void finishRecovery();

    return () => {
      cancelled = true;
    };
  }, [initialError]);

  if (isPending) {
    return <RouteLoading label="Finishing your password reset link..." variant="route" />;
  }

  return (
    <>
      <AuthStack>
        <p className={cn("pt-2 text-center", appTokens.authSubtitleText)}>
          {error ?? RECOVERY_SESSION_ERROR}
        </p>
        <AuthFooter>
          <AuthFooterText>
            <Link href="/login" className={appTokens.authInlineLink}>
              Log In
            </Link>
          </AuthFooterText>
        </AuthFooter>
      </AuthStack>
      <AuthDock>
        <BottomActionSingle>
          <BottomDockLink href="/login" intent="positive">
            Log In
          </BottomDockLink>
        </BottomActionSingle>
      </AuthDock>
    </>
  );
}
