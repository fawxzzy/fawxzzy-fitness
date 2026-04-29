"use client";

import { useEffect, useState } from "react";
import { establishRecoverySession } from "@/app/reset-password/actions";
import { hasRecoveryFragment, readRecoveryTokensFromHash } from "@/app/reset-password/recovery-fragment";
import { AuthStack, AuthStatusText } from "@/components/auth/AuthShell";
import { RouteLoading } from "@/components/RouteLoading";
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
    const supabase = createBrowserSupabase();

    const failRecovery = async () => {
      await supabase.auth.signOut();
      if (!cancelled) {
        setError(RECOVERY_SESSION_ERROR);
        setIsPending(false);
      }
    };

    const syncRecoverySession = async () => {
      if (cancelled) {
        return false;
      }

      const { accessToken, refreshToken, type } = readRecoveryTokensFromHash(window.location.hash);
      if (!accessToken || !refreshToken || type !== "recovery") {
        return false;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        await failRecovery();
        return true;
      }

      const result = await establishRecoverySession({
        accessToken,
        refreshToken,
      });

      if (cancelled) {
        return true;
      }

      if (!result.ok) {
        await failRecovery();
        return true;
      }

      window.location.replace("/reset-password");
      return true;
    };

    const finishRecovery = async () => {
      const recoveryHash = window.location.hash;

      if (!hasRecoveryFragment(recoveryHash)) {
        setError(RECOVERY_SESSION_ERROR);
        setIsPending(false);
        return;
      }

      if (await syncRecoverySession()) {
        return;
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
        <AuthStatusText>{error ?? RECOVERY_SESSION_ERROR}</AuthStatusText>
      </AuthStack>
    </>
  );
}
