"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
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

export function AppRecoveryScreen({
  digest,
  errorName,
  onReopen,
  title = "The app hit a full-shell error.",
  topMessage,
}: {
  digest?: string;
  errorName?: string;
  onReopen?: () => void;
  title?: string;
  topMessage?: ReactNode;
}) {
  const pathname = usePathname();
  const recoveryHref = `${SESSION_RECOVERY_ROUTE}?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`;
  const [navigationMessage, setNavigationMessage] = useState<string | null>(null);

  const clearRecoveryStateAndStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    clearClientRecoveryState(window.sessionStorage);

    const redirectKey = `${APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX}${CURRENT_APP_BUILD_ID}:${pathname ?? "unknown"}`;
    try {
      window.sessionStorage.removeItem(redirectKey);
    } catch {
      // Ignore storage failures and continue with recovery.
    }
  }, [pathname]);

  const handleRefreshApp = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    setNavigationMessage(null);
    clearRecoveryStateAndStorage();
    window.location.assign(buildFreshRecoveryReloadHref(window.location.href));
  }, [clearRecoveryStateAndStorage, pathname]);

  const handleOpenToday = useCallback(() => {
    clearRecoveryStateAndStorage();
    setNavigationMessage(null);
    void navigateToFirstSafeRecoveryHref({
      currentPath: pathname ?? null,
      preferredHrefs: ["/today"],
    }).then((href) => {
      if (!href) {
        setNavigationMessage("No safe screen was confirmed yet. Refresh the app instead of looping into another bad route.");
      }
    });
  }, [clearRecoveryStateAndStorage]);

  const handleGoToLogin = useCallback(() => {
    clearRecoveryStateAndStorage();
    setNavigationMessage(null);
    void navigateToFirstSafeRecoveryHref({
      currentPath: pathname ?? null,
      preferredHrefs: [recoveryHref, `/login?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`],
    }).then((href) => {
      if (!href) {
        setNavigationMessage("Login was not confirmed as a safe destination yet. Refresh the app instead of forcing another redirect.");
      }
    });
  }, [clearRecoveryStateAndStorage, recoveryHref]);

  const handleTryAgain = useCallback(() => {
    clearRecoveryStateAndStorage();
    setNavigationMessage(null);
    onReopen?.();
  }, [clearRecoveryStateAndStorage, onReopen]);

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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[rgb(var(--bg))] p-4">
      <SurfaceCard className="w-full max-w-[34rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.82)] backdrop-blur-xl">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]">
            App Error
          </p>
          <h1 className="text-[1.06rem] font-semibold leading-[1.2] text-[rgb(var(--text-primary)/0.96)]">
            {title}
          </h1>
          <p className="text-[0.88rem] leading-[1.45] text-[rgb(var(--text-secondary)/0.94)]">
            {topMessage ?? "This route was stopped before it could loop the crash. Safe exits are checked before navigation now."}
          </p>
        </div>
        <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-4 py-3">
          <p className="text-[0.76rem] font-medium uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
            App State
          </p>
          <div className="mt-1 space-y-1 text-[0.88rem] leading-[1.35] text-[rgb(var(--text-primary)/0.94)]">
            <p>Route: {pathname ?? "unknown"}</p>
            <p>Build: {CURRENT_APP_BUILD_ID}</p>
            {process.env.NODE_ENV !== "production" ? (
              <p>{errorName ?? "AppError"}{digest ? `: ${digest}` : ""}</p>
            ) : null}
          </div>
        </div>
        {navigationMessage ? (
          <p className="text-[0.82rem] leading-[1.4] text-[rgb(255,196,112)]">
            {navigationMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTryAgain}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.7)] px-4 text-[0.84rem] font-semibold text-[rgb(var(--text-primary)/0.96)] transition hover:bg-[rgb(var(--surface-2-rgb)/0.9)]"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={handleRefreshApp}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.92)] px-4 text-[0.84rem] font-semibold text-white transition hover:bg-[rgb(var(--accent)/1)]"
          >
            Refresh App
          </button>
          <button
            type="button"
            onClick={handleOpenToday}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-4 text-[0.84rem] font-semibold text-[rgb(var(--text-primary)/0.96)] transition hover:bg-[rgb(var(--surface-2-rgb)/0.82)]"
          >
            Open Today
          </button>
          <button
            type="button"
            onClick={handleGoToLogin}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-4 text-[0.84rem] font-semibold text-[rgb(var(--text-primary)/0.96)] transition hover:bg-[rgb(var(--surface-2-rgb)/0.82)]"
          >
            Go to Login
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}
