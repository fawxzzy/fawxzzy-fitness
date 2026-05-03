"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthCard, AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { RouteLoading } from "@/components/RouteLoading";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import {
  APP_UPDATE_STATUS_EVENT,
  type AppUpdateStatus,
  readPublishedAppUpdateStatus,
} from "@/lib/app-update-state";
import {
  buildAppLaunchRecoveryHref,
  clearAppLaunchRecoveryAttempt,
  markAppLaunchRecoveryAttempt,
  shouldAttemptAppLaunchRecovery,
} from "@/lib/app-launch-recovery";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";
import {
  trackEntryResolved,
} from "@/features/curated-onboarding/analytics.ts";
import type { CuratedOnboardingGateState } from "@/features/curated-onboarding/types.ts";
import { loadCuratedOnboardingGateState, markInitialExperienceSeen } from "@/features/curated-onboarding/storage.ts";
import {
  deriveInitialExperienceStage,
  destinationToHref,
  getInitialExperienceStageCopy,
  getNextInitialExperienceRecoveryStep,
  hasCommittedToTargetRoute,
  resolveGateDecision,
  type InitialExperienceGateStage,
  type ResolvedGateDecision,
} from "@/lib/initial-experience-gate";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";

type InitialExperienceGateProps = {
  curatedEngineEnabled: boolean;
  hasExistingProgram: boolean;
  userId: string;
};

type RedirectProgress = {
  attemptedCacheBustedReload: boolean;
  attemptedLocationReplace: boolean;
  attemptedRouterRetry: boolean;
  recoveryShown: boolean;
  startedAt: number;
  targetHref: string;
};

type RecoveryViewState = {
  elapsedMs: number;
  remoteBuildId: string | null;
  targetHref: string;
};

function readCurrentRelativeHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function buildTargetAbsoluteHref(targetHref: string) {
  return new URL(targetHref, window.location.origin).toString();
}

export function InitialExperienceGate({
  curatedEngineEnabled,
  hasExistingProgram,
  userId,
}: InitialExperienceGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const committedHrefRef = useRef<string | null>(null);
  const initialExperienceMarkedRef = useRef(false);
  const diagnosticsGateRef = useRef<ReturnType<typeof startLoadingDiagnosticGate> | null>(null);
  const redirectProgressRef = useRef<RedirectProgress | null>(null);
  const [gateState, setGateState] = useState<CuratedOnboardingGateState | null>(null);
  const [decision, setDecision] = useState<ResolvedGateDecision | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);
  const [recoveryState, setRecoveryState] = useState<RecoveryViewState | null>(null);
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus | null>(null);

  const resetGate = () => {
    clearAppLaunchRecoveryAttempt();
    committedHrefRef.current = null;
    initialExperienceMarkedRef.current = false;
    redirectProgressRef.current = null;
    setRecoveryState(null);
    setDecision(null);
    setGateState(null);
    setLoadFailed(false);
    setRetrySeed((value) => value + 1);
  };

  const attemptCacheBustedReload = useCallback((targetHref: string, elapsedMs: number) => {
    if (!shouldAttemptAppLaunchRecovery(window.sessionStorage, CURRENT_APP_BUILD_ID, targetHref)) {
      recordClientBootDiagnostic({
        tag: "[boot.entry]",
        source: "client",
        route: window.location.pathname,
        stage: "entry-launch-reload-guard-blocked",
        gateStage: "redirecting",
        targetHref,
        stageDurationMs: elapsedMs,
        buildId: CURRENT_APP_BUILD_ID,
        remoteBuildId: updateStatus?.remoteBuildId ?? null,
        authState: "authenticated",
      }, {
        level: "warn",
      });
      return false;
    }

    markAppLaunchRecoveryAttempt(window.sessionStorage, {
      buildId: CURRENT_APP_BUILD_ID,
      targetHref,
      updatedAt: Date.now(),
    });
    recordClientBootDiagnostic({
      tag: "[boot.entry]",
      source: "client",
      route: window.location.pathname,
      stage: "entry-launch-cache-busted-reload",
      gateStage: "redirecting",
      targetHref,
      stageDurationMs: elapsedMs,
      buildId: CURRENT_APP_BUILD_ID,
      remoteBuildId: updateStatus?.remoteBuildId ?? null,
      authState: "authenticated",
    }, {
      level: "warn",
    });

    void navigator.serviceWorker?.getRegistration()
      ?.then((registration) => registration?.update())
      .catch(() => {
        // Ignore service worker update failures and continue to the guarded reload.
      })
      .finally(() => {
        window.location.replace(
          buildAppLaunchRecoveryHref(
            buildTargetAbsoluteHref(targetHref),
            CURRENT_APP_BUILD_ID,
            targetHref,
          ),
        );
      });

    return true;
  }, [updateStatus?.remoteBuildId]);

  useEffect(() => {
    diagnosticsGateRef.current = startLoadingDiagnosticGate({
      gate: "entry.initial-experience",
      route: pathname ?? "/entry",
      source: "client",
      blockingReason: "Checking where authenticated entry should redirect next.",
      metadata: {
        curatedEngineEnabled,
        hasExistingProgram,
      },
      timeoutMs: 4500,
    });

    return () => {
      diagnosticsGateRef.current?.resolve({
        blockingReason: "Initial experience gate unmounted.",
      });
      diagnosticsGateRef.current = null;
    };
  }, [curatedEngineEnabled, hasExistingProgram, pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUpdateStatus(readPublishedAppUpdateStatus());

    const handleUpdateStatus = (event: Event) => {
      const nextStatus = (event as CustomEvent<AppUpdateStatus>).detail ?? readPublishedAppUpdateStatus();
      setUpdateStatus(nextStatus);
    };

    window.addEventListener(APP_UPDATE_STATUS_EVENT, handleUpdateStatus as EventListener);
    return () => {
      window.removeEventListener(APP_UPDATE_STATUS_EVENT, handleUpdateStatus as EventListener);
    };
  }, []);

  useEffect(() => {
    try {
      setLoadFailed(false);
      setGateState(loadCuratedOnboardingGateState(userId));
    } catch {
      setLoadFailed(true);
    }
  }, [curatedEngineEnabled, retrySeed, userId]);

  useEffect(() => {
    if (!gateState || decision || loadFailed) {
      return;
    }

    const nextDecision = resolveGateDecision(gateState, {
      curatedEngineEnabled,
      hasExistingProgram,
    });

    trackEntryResolved(
      {
        destination: nextDecision.destination.kind,
        isFirstLogin: nextDecision.isFirstLogin,
        curatedEnabled: curatedEngineEnabled,
        hasExistingProgram,
        hasSavedDraft: nextDecision.hasSavedDraft,
      },
      userId,
    );
    setDecision(nextDecision);
  }, [curatedEngineEnabled, decision, gateState, hasExistingProgram, loadFailed, userId]);

  useEffect(() => {
    if (!decision) {
      return;
    }

    const href = destinationToHref(decision.destination);

    if (href === pathname) {
      clearAppLaunchRecoveryAttempt();
      redirectProgressRef.current = null;
      diagnosticsGateRef.current?.resolve({
        blockingReason: "Initial experience destination already matches the current route.",
        metadata: {
          href,
        },
      });
      return;
    }

    if (committedHrefRef.current === href) {
      return;
    }

    committedHrefRef.current = href;
    redirectProgressRef.current = {
      attemptedCacheBustedReload: false,
      attemptedLocationReplace: false,
      attemptedRouterRetry: false,
      recoveryShown: false,
      startedAt: Date.now(),
      targetHref: href,
    };
    setRecoveryState(null);

    if (decision.destination.kind === "home" && !initialExperienceMarkedRef.current) {
      initialExperienceMarkedRef.current = true;
      markInitialExperienceSeen(userId, new Date().toISOString());
    }

    diagnosticsGateRef.current?.redirect({
      blockingReason: `Redirecting authenticated entry to ${href}.`,
      metadata: {
        href,
        destinationKind: decision.destination.kind,
      },
    });
    recordClientBootDiagnostic({
      tag: "[boot.entry]",
      source: "client",
      route: pathname ?? "/entry",
      stage: "entry-launch-router-replace",
      gateStage: "redirecting",
      targetHref: href,
      buildId: CURRENT_APP_BUILD_ID,
      remoteBuildId: updateStatus?.remoteBuildId ?? null,
      authState: "authenticated",
    });
    startTransition(() => {
      router.replace(href);
    });
  }, [decision, pathname, router, updateStatus?.remoteBuildId, userId]);

  useEffect(() => {
    if (!decision || typeof window === "undefined") {
      return;
    }

    const href = destinationToHref(decision.destination);
    if (href === pathname) {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;

    const tick = () => {
      if (cancelled) {
        return;
      }

      const progress = redirectProgressRef.current;
      if (!progress || progress.targetHref !== href) {
        return;
      }

      const routeCommitted = hasCommittedToTargetRoute(readCurrentRelativeHref(), href);
      if (routeCommitted) {
        clearAppLaunchRecoveryAttempt();
        return;
      }

      const elapsedMs = Date.now() - progress.startedAt;
      const nextStep = getNextInitialExperienceRecoveryStep({
        attemptedCacheBustedReload: progress.attemptedCacheBustedReload,
        attemptedLocationReplace: progress.attemptedLocationReplace,
        attemptedRouterRetry: progress.attemptedRouterRetry,
        canUseCacheBustedReload: shouldAttemptAppLaunchRecovery(window.sessionStorage, CURRENT_APP_BUILD_ID, href),
        currentBuildId: CURRENT_APP_BUILD_ID,
        elapsedMs,
        remoteBuildId: updateStatus?.remoteBuildId ?? null,
        routeCommitted,
        updatePhase: updateStatus?.phase ?? "idle",
      });

      if (nextStep === "retry-router") {
        progress.attemptedRouterRetry = true;
        recordClientBootDiagnostic({
          tag: "[boot.entry]",
          source: "client",
          route: window.location.pathname,
          stage: "entry-launch-router-retry",
          gateStage: "redirecting",
          targetHref: href,
          stageDurationMs: elapsedMs,
          buildId: CURRENT_APP_BUILD_ID,
          remoteBuildId: updateStatus?.remoteBuildId ?? null,
          authState: "authenticated",
        }, {
          level: "warn",
        });
        startTransition(() => {
          router.replace(href);
        });
      } else if (nextStep === "location-replace") {
        progress.attemptedLocationReplace = true;
        recordClientBootDiagnostic({
          tag: "[boot.entry]",
          source: "client",
          route: window.location.pathname,
          stage: "entry-launch-location-replace",
          gateStage: "redirecting",
          targetHref: href,
          stageDurationMs: elapsedMs,
          buildId: CURRENT_APP_BUILD_ID,
          remoteBuildId: updateStatus?.remoteBuildId ?? null,
          authState: "authenticated",
        }, {
          level: "warn",
        });
        window.location.replace(href);
        return;
      } else if (nextStep === "cache-busted-reload") {
        progress.attemptedCacheBustedReload = true;
        if (attemptCacheBustedReload(href, elapsedMs)) {
          return;
        }
      } else if (nextStep === "show-recovery" && !progress.recoveryShown) {
        progress.recoveryShown = true;
        setRecoveryState({
          elapsedMs,
          remoteBuildId: updateStatus?.remoteBuildId ?? null,
          targetHref: href,
        });
        recordClientBootDiagnostic({
          tag: "[boot.entry]",
          source: "client",
          route: window.location.pathname,
          stage: "entry-launch-recovery-ui",
          gateStage: "recovery",
          targetHref: href,
          stageDurationMs: elapsedMs,
          buildId: CURRENT_APP_BUILD_ID,
          remoteBuildId: updateStatus?.remoteBuildId ?? null,
          authState: "authenticated",
        }, {
          level: "error",
        });
        return;
      }

      timerId = window.setTimeout(tick, 250);
    };

    tick();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [attemptCacheBustedReload, decision, pathname, router, updateStatus?.phase, updateStatus?.remoteBuildId]);

  const stage: InitialExperienceGateStage = deriveInitialExperienceStage({
    decision,
    gateState,
    hasRecoveryState: Boolean(recoveryState),
    loadFailed,
  });
  const stageCopy = getInitialExperienceStageCopy(stage);

  useEffect(() => {
    const gate = diagnosticsGateRef.current;
    if (!gate) {
      return;
    }

    const progress = redirectProgressRef.current;
    const stageDurationMs = progress ? Date.now() - progress.startedAt : null;
    const targetHref = progress?.targetHref ?? committedHrefRef.current;

    if (stage === "error") {
      gate.error({
        blockingReason: "Initial experience state could not be restored from client storage.",
        metadata: {
          retrySeed,
          stage,
          targetHref,
          stageDurationMs,
        },
      });
      return;
    }

    gate.pending({
      blockingReason: stageCopy.detail,
      metadata: {
        hasDecision: Boolean(decision),
        hasGateState: Boolean(gateState),
        retrySeed,
        stage,
        stageDurationMs,
        targetHref,
        remoteBuildId: updateStatus?.remoteBuildId ?? null,
        serviceWorkerControlled: updateStatus?.serviceWorkerControlled ?? null,
        updatePhase: updateStatus?.phase ?? "idle",
      },
    });
  }, [decision, gateState, retrySeed, stage, stageCopy.detail, updateStatus]);

  if (stage === "recovery" && recoveryState) {
    return (
      <AuthShell>
        <AuthCard className={appTokens.authInteractiveCard} data-testid="initial-experience-gate-recovery">
          <AuthIntro
            eyebrow={stageCopy.eyebrow}
            title={stageCopy.title}
            subtitle={stageCopy.subtitle}
          />
          <div className="space-y-3 pt-2 text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">
            <p>
              The installed app stayed on the launch handoff longer than expected. A browser refresh should not be required.
            </p>
            <dl className="space-y-2 rounded-[var(--radius-lg)] border border-[rgb(var(--stroke-soft)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.62)] px-4 py-3 text-left">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Route</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{pathname ?? "/entry"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Target</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{recoveryState.targetHref}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Current build</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{CURRENT_APP_BUILD_ID}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Remote build</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{recoveryState.remoteBuildId ?? "unavailable"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[rgb(var(--text-muted))]">Time in handoff</dt>
                <dd className="font-medium text-[rgb(var(--text-primary))]">{Math.round(recoveryState.elapsedMs / 100) / 10}s</dd>
              </div>
            </dl>
          </div>
        </AuthCard>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
          <div className="space-y-3">
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="info"
                  onClick={resetGate}
                >
                  Retry
                </BottomDockButton>
              )}
              primary={(
                <BottomDockButton
                  type="button"
                  intent="positive"
                  onClick={() => {
                    window.location.assign("/today");
                  }}
                >
                  Open Today
                </BottomDockButton>
              )}
            />
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="info"
                  onClick={() => {
                    window.location.assign("/login?error=session_expired");
                  }}
                >
                  Go to Login
                </BottomDockButton>
              )}
              primary={(
                <BottomDockButton
                  type="button"
                  intent="positive"
                  onClick={() => {
                    if (!attemptCacheBustedReload(recoveryState.targetHref, recoveryState.elapsedMs)) {
                      window.location.reload();
                    }
                  }}
                >
                  Refresh App
                </BottomDockButton>
              )}
            />
          </div>
        </div>
      </AuthShell>
    );
  }

  if (stage !== "error") {
    return <RouteLoading label={stageCopy.detail} variant="route" />;
  }

  return (
    <AuthShell>
      <AuthCard className={appTokens.authInteractiveCard} data-testid="initial-experience-gate">
        <AuthIntro eyebrow="" title="" subtitle="" />
        <p className="pt-2 text-center text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">
          Could not open app.
        </p>
      </AuthCard>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <BottomActionSplit
          secondary={(
            <BottomDockButton
              type="button"
              intent="info"
              onClick={resetGate}
            >
              Retry
            </BottomDockButton>
          )}
          primary={(
            <BottomDockButton
              type="button"
              intent="positive"
              onClick={() => {
                window.location.assign("/today");
              }}
            >
              Start Offline
            </BottomDockButton>
          )}
        />
      </div>
    </AuthShell>
  );
}
