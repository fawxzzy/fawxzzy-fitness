"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthCard, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import {
  APP_THEME_LIBRARY_STORAGE_KEY,
  APP_THEME_SELECTION_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  applyAppTheme,
} from "@/lib/app-theme";
import { APP_UPDATE_NOTICE_KEY, APP_UPDATE_RELOAD_STATE_KEY } from "@/lib/app-update-state";
import {
  LAST_BOOT_DIAGNOSTIC_STORAGE_KEY,
  recordClientBootDiagnostic,
  resolveBootDisplayMode,
} from "@/lib/boot-diagnostics";
import {
  LOADING_DIAGNOSTICS_STORAGE_KEY,
  LOADING_DIAGNOSTICS_WINDOW_STORE_KEY,
} from "@/lib/loading-diagnostics";

const RECOVERY_STORAGE_KEYS = [
  APP_THEME_STORAGE_KEY,
  APP_THEME_LIBRARY_STORAGE_KEY,
  APP_THEME_SELECTION_STORAGE_KEY,
  APP_UPDATE_NOTICE_KEY,
  APP_UPDATE_RELOAD_STATE_KEY,
  LOADING_DIAGNOSTICS_STORAGE_KEY,
  LAST_BOOT_DIAGNOSTIC_STORAGE_KEY,
] as const;

function clearRecoveryStorage() {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of RECOVERY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures and keep clearing the remaining keys.
    }

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures and keep clearing the remaining keys.
    }
  }

  applyAppTheme(DEFAULT_APP_THEME);
  try {
    delete (window as Window & Record<string, unknown>)[LOADING_DIAGNOSTICS_WINDOW_STORE_KEY];
  } catch {
    // Ignore window cleanup failures and keep the recovery controls usable.
  }
}

function buildDigestLabel(digest: string | undefined) {
  return digest ? `Digest ${digest}` : "Digest unavailable";
}

export function AppRecoveryScreen({
  digest,
  errorName,
  onReopen,
  title = "Fitness hit a startup error.",
  topMessage,
}: {
  digest?: string;
  errorName?: string;
  onReopen?: () => void;
  title?: string;
  topMessage?: ReactNode;
}) {
  const pathname = usePathname();
  const [didClearLocalState, setDidClearLocalState] = useState(false);

  useEffect(() => {
    recordClientBootDiagnostic({
      tag: "[boot.entry]",
      source: "client",
      route: pathname ?? null,
      stage: "error-recovery-screen",
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
    <AuthShell>
      <AuthCard className={appTokens.authInteractiveCard}>
        <AuthStack className="items-center text-center">
          <div className="inline-flex rounded-full border border-[rgb(var(--danger-rgb)/0.26)] bg-[rgb(var(--danger-rgb)/0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--danger-rgb))]">
            Recovery
          </div>
          <div className="space-y-2">
            <h1 className="text-balance text-[1.55rem] font-semibold tracking-[-0.02em] text-[rgb(var(--text-primary))]">
              {title}
            </h1>
            <p className="mx-auto max-w-[26rem] text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">
              Reopen the app or go back to login. Clearing local app state only removes safe client-side caches and theme preferences.
            </p>
          </div>
          {topMessage ? (
            <div className="w-full rounded-[var(--radius-md)] border border-[rgb(var(--warning-rgb)/0.18)] bg-[rgb(var(--warning-rgb)/0.08)] px-3 py-2 text-sm text-[rgb(var(--text-secondary))]">
              {topMessage}
            </div>
          ) : null}
          <div className="w-full rounded-[var(--radius-lg)] border border-[rgb(var(--stroke-soft)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.62)] px-4 py-3 text-left shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
            <dl className="space-y-2 text-sm text-[rgb(var(--text-secondary))]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Route</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{pathname ?? "/"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Build</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{CURRENT_APP_BUILD_ID}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Error</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{errorName ?? "Application error"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Digest</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{buildDigestLabel(digest)}</dd>
              </div>
            </dl>
          </div>
          {didClearLocalState ? (
            <p className="text-sm text-[rgb(var(--success-rgb))]">
              Cleared app theme, update notice, reload state, and local diagnostics keys.
            </p>
          ) : null}
        </AuthStack>
      </AuthCard>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <div className="space-y-3">
          <BottomActionSplit
            secondary={(
              <BottomDockButton
                type="button"
                intent="info"
                onClick={() => {
                  if (onReopen) {
                    onReopen();
                    return;
                  }

                  window.location.reload();
                }}
              >
                Reopen
              </BottomDockButton>
            )}
            primary={(
              <BottomDockButton
                type="button"
                intent="positive"
                onClick={() => {
                  window.location.assign("/login?recovery=1");
                }}
              >
                Go to login
              </BottomDockButton>
            )}
          />
          <BottomDockButton
            type="button"
            intent="info"
            onClick={() => {
              clearRecoveryStorage();
              setDidClearLocalState(true);
            }}
          >
            Clear local app state
          </BottomDockButton>
        </div>
      </div>
    </AuthShell>
  );
}
