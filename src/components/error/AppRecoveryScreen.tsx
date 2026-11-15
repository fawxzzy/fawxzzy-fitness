"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AuthDockButton, AuthLinkButton, AuthLinks, AuthStatusScreen } from "@/components/auth/AuthShell";
import { ERROR_COPY } from "@/components/error/errorCopy";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import {
  recordClientBootDiagnostic,
  resolveBootDisplayMode,
} from "@/lib/boot-diagnostics";

export function AppRecoveryScreen({
  digest,
  errorName,
  onReopen,
  title = ERROR_COPY.boundaryTitle,
  topMessage,
}: {
  digest?: string;
  errorName?: string;
  onReopen?: () => void;
  title?: string;
  topMessage?: string;
}) {
  const pathname = usePathname();
  const recoveryStartedRef = useRef(false);

  useEffect(() => {
    if (recoveryStartedRef.current || typeof window === "undefined") {
      return;
    }
    recoveryStartedRef.current = true;

    recordClientBootDiagnostic({
      tag: "[boot.entry]",
      source: "client",
      route: pathname ?? null,
      stage: "error-auto-recovery",
      buildId: CURRENT_APP_BUILD_ID,
      displayMode: resolveBootDisplayMode(),
      serviceWorkerControlled:
        typeof navigator !== "undefined" && "serviceWorker" in navigator
          ? Boolean(navigator.serviceWorker.controller)
          : null,
      errorName: errorName ?? "AppError",
      errorMessage: digest ?? null,
    }, {
      level: "error",
    });

  }, [digest, errorName, pathname]);

  // Auth Surface v2 status screen: app icon, title, one line, Retry in the dock and Reload app as the one link.
  return (
    <AuthStatusScreen
      testId="app-recovery-screen"
      title={title}
      lead={topMessage ?? ERROR_COPY.boundaryBody}
      action={(
        <>
          <AuthLinks>
            <AuthLinkButton onClick={() => window.location.reload()}>{ERROR_COPY.reloadLabel}</AuthLinkButton>
          </AuthLinks>
          <AuthDockButton type="button" onClick={() => onReopen?.()}>
            {ERROR_COPY.retryLabel}
          </AuthDockButton>
        </>
      )}
    />
  );
}
