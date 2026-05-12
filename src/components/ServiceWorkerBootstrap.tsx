"use client";

import { useEffect, useState } from "react";
import { RouteLoading } from "@/components/RouteLoading";
import { useToast } from "@/components/ui/ToastProvider";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import {
  APP_UPDATE_NOTICE_KEY,
  APP_UPDATE_RELOAD_STATE_KEY,
  publishAppUpdateStatus,
  parseStoredAppUpdateReloadState,
  serializeStoredAppUpdateReloadState,
  shouldRestoreReloadState,
  shouldShowAppUpdateNotice,
} from "@/lib/app-update-state";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";

const UPDATE_POLL_INTERVAL_MS = 60_000;
const UPDATE_IDLE_THRESHOLD_MS = 12_000;
const UPDATE_RELOAD_FALLBACK_MS = 1_400;
const SESSION_KEEPALIVE_TIMEOUT_MS = 2_500;
const SCROLL_RESTORE_ATTEMPTS = 8;
const SCROLL_RESTORE_RETRY_MS = 120;
const SESSION_KEEPALIVE_LAUNCH_KEY = "fawxzzy:fitness:session-keepalive:launch";

function shouldPrioritizeImmediateUpdate(route: string) {
  if (route === "/" || route === "/entry") {
    return true;
  }

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
  } catch {
    // Fall through to navigator standalone detection.
  }

  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function shouldRunSessionKeepalive(route: string) {
  if (route === "/" || route === "/entry") {
    return true;
  }

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
  } catch {
    // Fall through to navigator standalone detection.
  }

  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function ServiceWorkerBootstrap() {
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawNotice = window.sessionStorage.getItem(APP_UPDATE_NOTICE_KEY);
      if (shouldShowAppUpdateNotice(rawNotice, CURRENT_APP_BUILD_ID)) {
        toast.success("Updated to the latest build.", { id: "app-update-applied" });
      }
      window.sessionStorage.removeItem(APP_UPDATE_NOTICE_KEY);

      const rawReloadState = window.sessionStorage.getItem(APP_UPDATE_RELOAD_STATE_KEY);
      const reloadState = parseStoredAppUpdateReloadState(rawReloadState);
      window.sessionStorage.removeItem(APP_UPDATE_RELOAD_STATE_KEY);

      if (!reloadState || !shouldRestoreReloadState(reloadState.href, window.location.href)) {
        return;
      }

      let attempts = 0;
      const restoreScroll = () => {
        window.scrollTo({ left: reloadState.scrollX, top: reloadState.scrollY, behavior: "auto" });
        document.scrollingElement?.scrollTo({ left: reloadState.scrollX, top: reloadState.scrollY, behavior: "auto" });
        attempts += 1;

        if (attempts >= SCROLL_RESTORE_ATTEMPTS) {
          return;
        }

        if (Math.abs(window.scrollY - reloadState.scrollY) <= 4) {
          return;
        }

        window.setTimeout(() => {
          window.requestAnimationFrame(restoreScroll);
        }, SCROLL_RESTORE_RETRY_MS);
      };

      window.requestAnimationFrame(restoreScroll);
    } catch {
      // Ignore storage failures and keep the app usable.
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const route = window.location.pathname;
    if (!shouldRunSessionKeepalive(route)) {
      return;
    }

    try {
      const rawLaunch = window.sessionStorage.getItem(SESSION_KEEPALIVE_LAUNCH_KEY);
      if (rawLaunch === CURRENT_APP_BUILD_ID) {
        return;
      }
      window.sessionStorage.setItem(SESSION_KEEPALIVE_LAUNCH_KEY, CURRENT_APP_BUILD_ID);
    } catch {
      // Continue without the sessionStorage launch guard if storage is unavailable.
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      abortController.abort();
    }, SESSION_KEEPALIVE_TIMEOUT_MS);

    void fetch("/auth/session-keepalive", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "cache-control": "no-cache",
      },
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Session keepalive failed with ${response.status}`);
        }

        const payload = await response.json() as {
          authState?: "anonymous" | "error" | "expired" | "refreshed";
          recoveryState?: "missing-access-cookie-recovered" | "refreshed-from-refresh-cookie" | string | null;
        };

        if (payload.authState === "refreshed") {
          recordClientBootDiagnostic({
            tag: "[boot.auth]",
            source: "client",
            route,
            stage: "session-keepalive-refreshed",
            buildId: CURRENT_APP_BUILD_ID,
            authState:
              payload.recoveryState === "missing-access-cookie-recovered"
                ? "missing-access-cookie-recovered"
                : "refreshed-from-refresh-cookie",
          });
          return;
        }

        if (payload.authState === "anonymous") {
          recordClientBootDiagnostic({
            tag: "[boot.auth]",
            source: "client",
            route,
            stage: "session-keepalive-anonymous",
            buildId: CURRENT_APP_BUILD_ID,
            authState: "no-cookies",
          });
          return;
        }

        if (payload.authState === "expired") {
          recordClientBootDiagnostic({
            tag: "[boot.auth]",
            source: "client",
            route,
            stage: "session-keepalive-expired",
            buildId: CURRENT_APP_BUILD_ID,
            authState: "redirected-login",
          }, {
            level: "warn",
          });
          if (!route.startsWith("/login")) {
            window.location.replace("/login?error=session_expired");
          }
        }
      })
      .catch((error) => {
        const isAbortError = error instanceof DOMException && error.name === "AbortError";
        recordClientBootDiagnostic({
          tag: "[boot.auth]",
          source: "client",
          route,
          stage: isAbortError ? "session-keepalive-timeout" : "session-keepalive-failed",
          buildId: CURRENT_APP_BUILD_ID,
          authState: "auth-error",
          errorName: error instanceof Error ? error.name : null,
          errorMessage: error instanceof Error ? error.message : typeof error === "string" ? error : null,
        }, {
          level: isAbortError ? "warn" : "error",
        });
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        } catch {
          // Ignore local cleanup failures in dev.
        }

        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
        } catch {
          // Ignore local cache cleanup failures in dev.
        }
      })();
      return;
    }

    let cancelled = false;
    let reloadingForUpdate = false;
    let isTransitioningUpdate = false;
    let lastInteractionAt = Date.now();
    let pendingRegistration: ServiceWorkerRegistration | null = null;
    let pendingBuildId: string | null = null;
    const hadControllerAtBoot = Boolean(navigator.serviceWorker.controller);
    let idleTimerId: number | null = null;
    let reloadTimerId: number | null = null;
    let teardown: (() => void) | null = null;

    const publishStatus = (phase: "idle" | "checking" | "update-queued" | "applying-update" | "error", remoteBuildId?: string | null) => {
      publishAppUpdateStatus({
        currentBuildId: CURRENT_APP_BUILD_ID,
        phase,
        remoteBuildId: remoteBuildId ?? pendingBuildId ?? null,
        route: window.location.pathname,
        serviceWorkerControlled: "serviceWorker" in navigator ? Boolean(navigator.serviceWorker.controller) : null,
        updatedAt: Date.now(),
      });
    };

    publishStatus("checking", null);

    const clearIdleTimer = () => {
      if (idleTimerId !== null) {
        window.clearTimeout(idleTimerId);
        idleTimerId = null;
      }
    };

    const clearReloadTimer = () => {
      if (reloadTimerId !== null) {
        window.clearTimeout(reloadTimerId);
        reloadTimerId = null;
      }
    };

    const rememberReloadState = (targetBuildId: string | null) => {
      try {
        window.sessionStorage.setItem(
          APP_UPDATE_RELOAD_STATE_KEY,
          serializeStoredAppUpdateReloadState({
            href: window.location.href,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            targetBuildId,
            updatedAt: Date.now(),
          }),
        );

        if (targetBuildId) {
          window.sessionStorage.setItem(
            APP_UPDATE_NOTICE_KEY,
            JSON.stringify({ targetBuildId }),
          );
        } else {
          window.sessionStorage.removeItem(APP_UPDATE_NOTICE_KEY);
        }
      } catch {
        // Ignore storage failures and continue with the reload.
      }
    };

    const promoteWaitingWorker = (registration: ServiceWorkerRegistration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    };

    const reloadApp = () => {
      if (cancelled || reloadingForUpdate) {
        return;
      }

      publishStatus("applying-update");
      recordClientBootDiagnostic({
        tag: "[boot.service-worker]",
        source: "client",
        route: window.location.pathname,
        stage: "reload-app",
        buildId: CURRENT_APP_BUILD_ID,
      });
      reloadingForUpdate = true;
      window.location.reload();
    };

    const beginUpdateTransition = (registration?: ServiceWorkerRegistration | null, targetBuildId?: string | null) => {
      if (cancelled || reloadingForUpdate || isTransitioningUpdate) {
        return;
      }

      isTransitioningUpdate = true;
      pendingRegistration = registration ?? pendingRegistration;
      pendingBuildId = targetBuildId ?? pendingBuildId;
      clearIdleTimer();
      clearReloadTimer();
      rememberReloadState(pendingBuildId);
      publishStatus("applying-update", pendingBuildId);
      recordClientBootDiagnostic({
        tag: "[boot.service-worker]",
        source: "client",
        route: window.location.pathname,
        stage: "begin-update-transition",
        buildId: CURRENT_APP_BUILD_ID,
        remoteBuildId: pendingBuildId,
      });

      if (document.visibilityState === "visible") {
        setIsApplyingUpdate(true);
      }

      if (pendingRegistration?.waiting) {
        promoteWaitingWorker(pendingRegistration);
      }

      reloadTimerId = window.setTimeout(() => {
        reloadApp();
      }, UPDATE_RELOAD_FALLBACK_MS);
    };

    const scheduleIdleUpdate = () => {
      if (!pendingRegistration || cancelled || reloadingForUpdate || isTransitioningUpdate) {
        return;
      }

      clearIdleTimer();
      const idleDelayMs = Math.max(0, UPDATE_IDLE_THRESHOLD_MS - (Date.now() - lastInteractionAt));

      idleTimerId = window.setTimeout(() => {
        if (document.visibilityState === "hidden") {
          beginUpdateTransition(pendingRegistration, pendingBuildId);
          return;
        }

        beginUpdateTransition(pendingRegistration, pendingBuildId);
      }, idleDelayMs);
    };

    const requestRegistrationUpdate = (registration: ServiceWorkerRegistration) => {
      void registration.update().catch(() => {
        // Keep the app usable even if an update check fails.
      });
    };

    const queueUpdate = (registration: ServiceWorkerRegistration, targetBuildId: string | null) => {
      pendingRegistration = registration;
      pendingBuildId = targetBuildId ?? pendingBuildId;
      publishStatus("update-queued", pendingBuildId);
      requestRegistrationUpdate(registration);

      if (document.visibilityState === "hidden" || shouldPrioritizeImmediateUpdate(window.location.pathname)) {
        beginUpdateTransition(registration, pendingBuildId);
        return;
      }

      scheduleIdleUpdate();
    };

    const bindRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        queueUpdate(registration, pendingBuildId);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state !== "installed") {
            return;
          }

          if (navigator.serviceWorker.controller) {
            queueUpdate(registration, pendingBuildId);
          }
        });
      });
    };

    const checkVersionManifest = async (registration: ServiceWorkerRegistration) => {
      try {
        const response = await fetch("/api/app-version", {
          cache: "no-store",
          headers: {
            "cache-control": "no-cache",
          },
        });
        if (!response.ok) {
          return;
        }

        const manifest = await response.json() as { buildId?: string | null };
        const remoteBuildId = manifest.buildId?.trim();
        if (!remoteBuildId || remoteBuildId === CURRENT_APP_BUILD_ID) {
          publishStatus("idle", remoteBuildId ?? null);
          return;
        }

        recordClientBootDiagnostic({
          tag: "[boot.service-worker]",
          source: "client",
          route: window.location.pathname,
          stage: "remote-build-mismatch",
          buildId: CURRENT_APP_BUILD_ID,
          remoteBuildId,
        });
        queueUpdate(registration, remoteBuildId);
      } catch {
        // Keep the app usable even if the version check fails.
      }
    };

    const handleControllerChange = () => {
      if (cancelled || reloadingForUpdate) {
        return;
      }

      if (!hadControllerAtBoot && !isTransitioningUpdate) {
        return;
      }

      if (!isTransitioningUpdate) {
        rememberReloadState(pendingBuildId);
      }

      setIsApplyingUpdate(document.visibilityState === "visible");
      publishStatus("applying-update", pendingBuildId);
      reloadApp();
    };

    const handleVisibilityOrFocus = (registration: ServiceWorkerRegistration) => {
      if (document.visibilityState === "hidden") {
        if (pendingRegistration) {
          beginUpdateTransition(pendingRegistration, pendingBuildId);
        }
        return;
      }

      requestRegistrationUpdate(registration);
      void checkVersionManifest(registration);

      if (pendingRegistration) {
        scheduleIdleUpdate();
      }
    };

    const recordInteraction = () => {
      lastInteractionAt = Date.now();

      if (pendingRegistration && document.visibilityState === "visible") {
        scheduleIdleUpdate();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) {
          return;
        }

        bindRegistration(registration);
        publishStatus("idle");
        requestRegistrationUpdate(registration);
        void checkVersionManifest(registration);

        const intervalId = window.setInterval(() => {
          if (document.visibilityState === "visible") {
            requestRegistrationUpdate(registration);
            void checkVersionManifest(registration);
          }
        }, UPDATE_POLL_INTERVAL_MS);

        const onVisibilityChange = () => handleVisibilityOrFocus(registration);
        const onFocus = () => handleVisibilityOrFocus(registration);

        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("focus", onFocus);
        window.addEventListener("pointerdown", recordInteraction, { passive: true });
        window.addEventListener("touchstart", recordInteraction, { passive: true });
        window.addEventListener("keydown", recordInteraction);

        return () => {
          clearIdleTimer();
          clearReloadTimer();
          window.clearInterval(intervalId);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("focus", onFocus);
          window.removeEventListener("pointerdown", recordInteraction);
          window.removeEventListener("touchstart", recordInteraction);
          window.removeEventListener("keydown", recordInteraction);
        };
      })
      .then((cleanup) => {
        if (!cleanup) {
          return;
        }

        if (cancelled) {
          cleanup();
          return;
        }

        teardown = cleanup;
      })
      .catch((error) => {
        publishStatus("error");
        recordClientBootDiagnostic({
          tag: "[boot.service-worker]",
          source: "client",
          route: typeof window !== "undefined" ? window.location.pathname : null,
          stage: "register-failed",
          buildId: CURRENT_APP_BUILD_ID,
          errorName: error instanceof Error ? error.name : null,
          errorMessage: error instanceof Error ? error.message : typeof error === "string" ? error : null,
        }, {
          level: "error",
        });
        console.error("Failed to register service worker", error);
      });

    return () => {
      cancelled = true;
      clearIdleTimer();
      clearReloadTimer();
      teardown?.();
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (isApplyingUpdate) {
    return (
      <RouteLoading
        label="Updating FawxzzyFitness"
        detail="Refreshing to the latest build."
        variant="boot"
      />
    );
  }

  return null;
}
