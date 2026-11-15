"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthDockButton, AuthLink, AuthLinks, AuthStatusScreen } from "@/components/auth/AuthShell";
import { authNotice } from "@/components/auth/authMessages";
import { RouteLoading } from "@/components/RouteLoading";
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
import { INITIAL_EXPERIENCE_LOADING_VARIANT } from "@/lib/route-loading";

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
    // The handoff stalled. Same status screen as every failure: one box, one button, a way to Today. The build ids
    // stay in the boot diagnostics (gate.pending metadata above), not on screen.
    return (
      <AuthStatusScreen
        testId="initial-experience-gate-recovery"
        title="Could not load"
        notice={authNotice("page.crash")}
        action={(
          <>
            <AuthLinks>
              <AuthLink href="/today">Go to Today</AuthLink>
            </AuthLinks>
            <AuthDockButton
              type="button"
              onClick={() => {
                if (!attemptCacheBustedReload(recoveryState.targetHref, recoveryState.elapsedMs)) {
                  window.location.reload();
                }
              }}
            >
              Try again
            </AuthDockButton>
          </>
        )}
      />
    );
  }

  if (stage !== "error") {
    return <RouteLoading label={stageCopy.detail} variant={INITIAL_EXPERIENCE_LOADING_VARIANT} />;
  }

  return (
    <AuthStatusScreen
      testId="initial-experience-gate"
      title="Could not load"
      notice={authNotice("page.crash")}
      action={(
        <>
          <AuthLinks>
            <AuthLink href="/today">Go to Today</AuthLink>
          </AuthLinks>
          <AuthDockButton type="button" onClick={resetGate}>
            Try again
          </AuthDockButton>
        </>
      )}
    />
  );
}
