"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { SESSION_EXPIRED_LOGIN_ERROR, SESSION_RECOVERY_ROUTE } from "@/lib/auth-session";
import {
  recordClientBootDiagnostic,
  resolveBootDisplayMode,
} from "@/lib/boot-diagnostics";

const APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX = "fitness:app-recovery-login-redirect:";

export function AppRecoveryScreen({
  digest,
  errorName,
}: {
  digest?: string;
  errorName?: string;
  onReopen?: () => void;
  title?: string;
  topMessage?: ReactNode;
}) {
  const pathname = usePathname();
  const recoveryHref = `${SESSION_RECOVERY_ROUTE}?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`;

  useEffect(() => {
    recordClientBootDiagnostic({
      tag: "[boot.entry]",
      source: "client",
      route: pathname ?? null,
      stage: "error-recovery-screen",
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const redirectKey = `${APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX}${CURRENT_APP_BUILD_ID}:${pathname ?? "unknown"}`;
    try {
      if (window.sessionStorage.getItem(redirectKey) === "1") {
        window.location.replace(`/login?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`);
        return;
      }
      window.sessionStorage.setItem(redirectKey, "1");
    } catch {
      // If storage is unavailable, still try the safe cookie-clearing login route.
    }

    window.location.replace(recoveryHref);
  }, [pathname, recoveryHref]);

  return null;
}
