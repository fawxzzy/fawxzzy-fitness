"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { SESSION_EXPIRED_LOGIN_ERROR, SESSION_RECOVERY_ROUTE } from "@/lib/auth-session";
import {
  recordClientBootDiagnostic,
  resolveBootDisplayMode,
} from "@/lib/boot-diagnostics";
import {
  buildFreshRecoveryReloadHref,
  clearClientRecoveryState,
} from "@/lib/client-recovery-reset";
import { navigateToFirstSafeRecoveryHref } from "@/components/error/safeRecoveryNavigation";

const APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX = "fitness:app-recovery-login-redirect:";
const APP_RECOVERY_TOAST_MESSAGE = "That screen crashed. Fitness recovered to a safe screen.";

function isPath(pathname: string | null | undefined, target: string) {
  return pathname === target || Boolean(pathname?.startsWith(`${target}/`));
}

export function AppRecoveryScreen({
  digest,
  errorName,
  onReopen: _onReopen,
  title: _title = "The app hit a full-shell error.",
  topMessage: _topMessage,
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

    clearClientRecoveryState(window.sessionStorage);
    const redirectKey = `${APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX}${CURRENT_APP_BUILD_ID}:${pathname ?? "unknown"}`;
    try {
      window.sessionStorage.removeItem(redirectKey);
    } catch {
      // Ignore storage failures and continue with recovery.
    }

    const recoveryHref = `${SESSION_RECOVERY_ROUTE}?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`;
    const loginHref = `/login?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`;
    const preferredHrefs = isPath(pathname, "/today")
      ? [recoveryHref, loginHref]
      : isPath(pathname, "/login")
        ? []
        : [];

    void navigateToFirstSafeRecoveryHref({
      currentPath: pathname ?? null,
      preferredHrefs,
      recoveryErrorMessage: APP_RECOVERY_TOAST_MESSAGE,
    }).then((href) => {
      if (!href) {
        window.location.assign(buildFreshRecoveryReloadHref(isPath(pathname, "/login") ? "/login" : "/today"));
      }
    });
  }, [digest, errorName, pathname]);

  return (
    <div className="fixed inset-0 grid place-items-center bg-[rgb(var(--bg))] p-4">
      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-secondary)/0.82)]">
        Recovering
      </p>
    </div>
  );
}
