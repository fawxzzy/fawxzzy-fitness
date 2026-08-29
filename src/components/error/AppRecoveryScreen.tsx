"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import {
  recordClientBootDiagnostic,
  resolveBootDisplayMode,
} from "@/lib/boot-diagnostics";

export function AppRecoveryScreen({
  digest,
  errorName,
  onReopen,
  title = "Fitness could not load this screen.",
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

  return (
    <div className="fixed inset-0 grid place-items-center bg-[rgb(var(--bg))] p-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-base font-semibold text-[rgb(var(--text-primary))]">{title}</p>
        {topMessage ? (
          <div className="text-sm text-[rgb(var(--text-secondary))]">{topMessage}</div>
        ) : (
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Your account is still signed in. Retry after the data service is available.
          </p>
        )}
        <button
          type="button"
          className="min-h-11 rounded-full border border-[rgb(var(--border-strong)/0.42)] px-6 text-sm font-semibold text-[rgb(var(--text-primary))]"
          onClick={() => onReopen?.()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
