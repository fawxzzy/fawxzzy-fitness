"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
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
  topMessage?: ReactNode;
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

  const btn = (variant: "primary" | "secondary") => getAppButtonClassName({ variant, fullWidth: true });

  return (
    <div className="fixed inset-0 grid place-items-center bg-[rgb(var(--bg))] p-4">
      <SurfaceCard className="w-full max-w-sm space-y-4 text-center" role="alert">
        <p className="text-base font-semibold text-[rgb(var(--text-primary))]">{title}</p>
        <div className="text-sm text-[rgb(var(--text-secondary))]">{topMessage ?? ERROR_COPY.boundaryBody}</div>
        <div className="flex flex-col gap-3">
          <button type="button" className={btn("primary")} onClick={() => onReopen?.()}>
            {ERROR_COPY.retryLabel}
          </button>
          <button type="button" className={btn("secondary")} onClick={() => window.location.reload()}>
            {ERROR_COPY.reloadLabel}
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}
