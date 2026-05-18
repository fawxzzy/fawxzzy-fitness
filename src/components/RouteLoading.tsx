"use client";

import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";
import {
  getRouteLoadingDelayMs,
  shouldHideRouteLoadingChrome,
  type RouteLoadingVariant,
} from "@/lib/route-loading";
import {
  buildRouteLoadingRecoveryHref,
  clearRouteLoadingRecoveryAttempt,
  markRouteLoadingRecoveryAttempt,
  normalizeRouteLoadingRecoveryRouteKey,
  readRouteLoadingRecoveryAttempt,
  ROUTE_LOADING_RECOVERY_TIMEOUT_MS,
} from "@/lib/route-loading-recovery";
const LOADING_PARTICLES = [
  { left: "18%", top: "22%", dx: "10px", dy: "24px", duration: "16s", delay: "0ms" },
  { left: "74%", top: "18%", dx: "-12px", dy: "28px", duration: "19s", delay: "1400ms" },
  { left: "84%", top: "62%", dx: "-10px", dy: "18px", duration: "15s", delay: "700ms" },
  { left: "26%", top: "74%", dx: "12px", dy: "22px", duration: "21s", delay: "1800ms" },
  { left: "56%", top: "82%", dx: "-8px", dy: "16px", duration: "18s", delay: "3200ms" },
  { left: "44%", top: "16%", dx: "6px", dy: "14px", duration: "17s", delay: "900ms" },
] as const;

function useDelayedVisible(delayMs: number) {
  const [isVisible, setIsVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) {
      setIsVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return isVisible;
}

function setRouteLoadingChromeHidden(isActive: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const currentCount = Number.parseInt(root.dataset.routeLoadingCount ?? "0", 10);
  const safeCount = Number.isFinite(currentCount) ? currentCount : 0;

  if (isActive) {
    const nextCount = safeCount + 1;
    root.dataset.routeLoadingCount = String(nextCount);
    root.dataset.routeLoading = "true";
    return;
  }

  const nextCount = Math.max(0, safeCount - 1);
  if (nextCount === 0) {
    delete root.dataset.routeLoadingCount;
    delete root.dataset.routeLoading;
    return;
  }

  root.dataset.routeLoadingCount = String(nextCount);
}

type RouteLoadingRecoveryState = {
  elapsedMs: number;
  routeKey: string;
};

export function RouteLoading({
  label = "Loading...",
  detail,
  variant = "route",
  gateName,
  blockingReason,
  timeoutMs,
}: {
  label?: string;
  detail?: string;
  variant?: RouteLoadingVariant;
  gateName?: string;
  blockingReason?: string;
  timeoutMs?: number;
}) {
  const isVisible = useDelayedVisible(getRouteLoadingDelayMs(variant));
  const chromeHidden = shouldHideRouteLoadingChrome(variant, isVisible);
  const gateRef = useRef<ReturnType<typeof startLoadingDiagnosticGate> | null>(null);
  const recoveryTriggeredRef = useRef(false);
  const [recoveryState, setRecoveryState] = useState<RouteLoadingRecoveryState | null>(null);

  useEffect(() => {
    if (!gateName) {
      return;
    }

    gateRef.current = startLoadingDiagnosticGate({
      gate: gateName,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      source: "client",
      blockingReason: blockingReason ?? detail ?? label,
      metadata: {
        variant,
        detail: detail ?? null,
        label,
      },
      timeoutMs: timeoutMs ?? (variant === "boot" ? 5000 : 3500),
    });

    return () => {
      gateRef.current?.resolve({
        blockingReason: "Route loading overlay unmounted.",
      });
      gateRef.current = null;
    };
  }, [blockingReason, detail, gateName, label, timeoutMs, variant]);

  useLayoutEffect(() => {
    if (!chromeHidden) {
      return;
    }

    setRouteLoadingChromeHidden(true);

    return () => {
      setRouteLoadingChromeHidden(false);
    };
  }, [chromeHidden]);

  useEffect(() => {
    gateRef.current?.pending({
      blockingReason: blockingReason ?? detail ?? label,
      metadata: {
        variant,
        visible: isVisible,
        recoveryShown: Boolean(recoveryState),
      },
    });
  }, [blockingReason, detail, isVisible, label, recoveryState, variant]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const routeKey = normalizeRouteLoadingRecoveryRouteKey(window.location.href);
    const startedAtMs = Date.now();
    recoveryTriggeredRef.current = false;
    setRecoveryState(null);

    const timerId = window.setTimeout(() => {
      const existingAttempt = readRouteLoadingRecoveryAttempt(
        window.sessionStorage,
        CURRENT_APP_BUILD_ID,
        routeKey,
      );
      const elapsedMs = Date.now() - startedAtMs;

      if (!existingAttempt || existingAttempt.attemptCount < 1) {
        recoveryTriggeredRef.current = true;
        markRouteLoadingRecoveryAttempt(window.sessionStorage, {
          attemptCount: (existingAttempt?.attemptCount ?? 0) + 1,
          buildId: CURRENT_APP_BUILD_ID,
          routeKey,
          updatedAt: Date.now(),
        });
        gateRef.current?.pending({
          blockingReason: "Route loading exceeded the recovery threshold. Attempting one guarded reload.",
          metadata: {
            routeKey,
            recoveryAction: "reload",
          },
        });
        recordClientBootDiagnostic({
          tag: "[boot.service-worker]",
          source: "client",
          route: window.location.pathname,
          stage: "route-loading-recovery-reload",
          buildId: CURRENT_APP_BUILD_ID,
          stageDurationMs: elapsedMs,
        }, {
          level: "warn",
        });

        void navigator.serviceWorker?.getRegistration()
          ?.then((registration) => registration?.update())
          .catch(() => {
            // Ignore service worker refresh failures and continue to the guarded reload.
          })
          .finally(() => {
            window.location.replace(buildRouteLoadingRecoveryHref(window.location.href));
          });
        return;
      }

      gateRef.current?.error({
        blockingReason: "Route loading exceeded the recovery threshold after one guarded reload.",
        metadata: {
          routeKey,
          recoveryAction: "show-recovery",
        },
      });
      recordClientBootDiagnostic({
        tag: "[boot.service-worker]",
        source: "client",
        route: window.location.pathname,
        stage: "route-loading-recovery-screen",
        buildId: CURRENT_APP_BUILD_ID,
        stageDurationMs: elapsedMs,
      }, {
        level: "error",
      });
      setRecoveryState({
        elapsedMs,
        routeKey,
      });
    }, ROUTE_LOADING_RECOVERY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
      if (!recoveryTriggeredRef.current) {
        clearRouteLoadingRecoveryAttempt(window.sessionStorage);
      }
    };
  }, []);

  if (recoveryState) {
    return (
      <section className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgb(var(--loader-scan-rgb)/0.16),transparent_22%),linear-gradient(180deg,rgb(var(--surface-3-rgb)/0.08),rgb(var(--surface-1-rgb)/0.34))]" />
        <div className="route-loading__grid" />
        <div className="route-loading__scan" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-[32px] border border-[rgb(var(--stroke-soft)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.94)] px-5 py-6 shadow-[0_28px_90px_rgb(4_8_18/0.38)] backdrop-blur-xl">
            <div className="grid place-items-center gap-4 text-center">
              <FawxzzySigilLoader size="lg" />
              <div className="space-y-2">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--text-muted)/0.78)]">
                  Recovery mode
                </p>
                <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
                  Loading took too long.
                </h2>
                <p className="text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">
                  FawxzzyFitness already tried one safe reload after 15 seconds. This screen prevents an infinite reload loop.
                </p>
              </div>
              <dl className="w-full space-y-2 rounded-[24px] border border-[rgb(var(--stroke-soft)/0.14)] bg-[rgb(var(--surface-0-rgb)/0.82)] px-4 py-3 text-left text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[rgb(var(--text-muted))]">Route</dt>
                  <dd className="font-medium text-[rgb(var(--text-primary))]">{recoveryState.routeKey}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[rgb(var(--text-muted))]">Current build</dt>
                  <dd className="font-medium text-[rgb(var(--text-primary))]">{CURRENT_APP_BUILD_ID}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[rgb(var(--text-muted))]">Elapsed</dt>
                  <dd className="font-medium text-[rgb(var(--text-primary))]">{Math.round(recoveryState.elapsedMs / 100) / 10}s</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <div className="pointer-events-auto space-y-3">
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="info"
                  onClick={() => {
                    clearRouteLoadingRecoveryAttempt(window.sessionStorage);
                    window.location.reload();
                  }}
                >
                  Retry
                </BottomDockButton>
              )}
              primary={(
                <BottomDockButton
                  type="button"
                  intent="positive"
                  onClick={() => {
                    clearRouteLoadingRecoveryAttempt(window.sessionStorage);
                    window.location.assign("/auth/session-recovery?error=session_expired");
                  }}
                >
                  Go to Login
                </BottomDockButton>
              )}
            />
          </div>
        </div>
      </section>
    );
  }

  if (!isVisible) {
    return null;
  }

  return (
    <section className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgb(var(--loader-scan-rgb)/0.18),transparent_22%),linear-gradient(180deg,rgb(var(--surface-3-rgb)/0.08),rgb(var(--surface-1-rgb)/0.26))]" />
      <div className="route-loading__grid" />
      <div className="route-loading__scan" />
      <div className="route-loading__glow left-[12%] top-[14%] h-44 w-44 bg-[rgb(var(--loader-scan-rgb)/0.24)] [--route-loading-dx:14px] [--route-loading-dy:10px]" />
      <div className="route-loading__glow right-[12%] bottom-[14%] h-40 w-40 bg-[rgb(var(--loader-scan-rgb)/0.18)] [--route-loading-dx:-12px] [--route-loading-dy:-10px]" style={{ animationDelay: "2200ms" }} />
      {LOADING_PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}-${variant}`}
          className="route-loading__particle"
          style={{
            left: particle.left,
            top: particle.top,
            "--route-loading-particle-dx": particle.dx,
            "--route-loading-particle-dy": particle.dy,
            "--route-loading-duration": particle.duration,
            "--route-loading-delay": particle.delay,
          } as CSSProperties}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="grid place-items-center" role="status" aria-live="polite">
          <span className="sr-only">{detail ? `${label} ${detail}` : label}</span>
          <FawxzzySigilLoader size="xl" />
        </div>
      </div>
    </section>
  );
}

export function RouteTabLoading() {
  return (
    <RouteLoading
      label="Loading tab..."
      gateName="route.tab-loading"
      blockingReason="Waiting for the selected tab route to render."
    />
  );
}
