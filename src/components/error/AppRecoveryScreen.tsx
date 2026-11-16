"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AuthDockButton, AuthLinks, AuthStatusScreen } from "@/components/auth/AuthShell";
import { authNotice } from "@/components/auth/authMessages";
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
}: {
  digest?: string;
  errorName?: string;
  onReopen?: () => void;
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

  // Auth Surface v2 crash screen, words from the shared copy matrix: "Could not load", the one `page.crash` notice,
  // Try again in the dock (re-render, or a reload when there is nothing to re-render) and a plain link back to Today
  // (a full page load). Neither path signs the person out.
  return (
    <AuthStatusScreen
      testId="app-recovery-screen"
      title={ERROR_COPY.boundaryTitle}
      notice={authNotice("page.crash")}
      action={(
        <>
          <AuthLinks>
            <a className="fx-link" href={ERROR_COPY.homeHref}>{ERROR_COPY.homeLabel}</a>
          </AuthLinks>
          <AuthDockButton type="button" onClick={() => (onReopen ? onReopen() : window.location.reload())}>
            {ERROR_COPY.retryLabel}
          </AuthDockButton>
        </>
      )}
    />
  );
}
