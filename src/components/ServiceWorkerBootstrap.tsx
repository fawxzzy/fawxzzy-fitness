"use client";

import { useEffect } from "react";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import {
  APP_UPDATE_NOTICE_KEY,
  APP_UPDATE_RELOAD_STATE_KEY,
  type StoredAppUpdateReloadState,
  publishAppUpdateStatus,
  parseStoredAppUpdateReloadState,
  serializeStoredAppUpdateReloadState,
  shouldRestoreReloadState,
} from "@/lib/app-update-state";
import {
  APP_UPDATE_LAST_APPLY_KEY,
  APP_UPDATE_REQUIRED_SINCE_KEY,
  type AppUpdateBoundary,
  type AppVersionManifest,
  type DraftFieldSnapshot,
  type StoredFormDraft,
  collectFormDrafts,
  decideAppUpdateApply,
  isActiveSessionRoute,
  isBelowMinBuild,
  isColdLaunchWindow,
  resolveRequiredSince,
  serializeApplyAttempt,
  shouldAttemptApply,
} from "@/lib/app-update-policy";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";
import { readActiveSessionHint } from "@/lib/session-state-sync";

const UPDATE_POLL_INTERVAL_MS = 60_000;
const SESSION_KEEPALIVE_TIMEOUT_MS = 2_500;
const SCROLL_RESTORE_ATTEMPTS = 8;
const SCROLL_RESTORE_RETRY_MS = 120;
const SESSION_KEEPALIVE_LAUNCH_KEY = "fawxzzy:fitness:session-keepalive:launch";
const DRAFT_FIELD_SELECTOR = "input, textarea, select";

function shouldRunSessionKeepalive(route: string) {
  // Review fixtures are deliberately public and do not load account data.
  if (route === "/review" || route.startsWith("/review/")) {
    return false;
  }

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

function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, quota); the update still waits for a boundary.
  }
}

function isEditableField(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function snapshotDraftFields(): DraftFieldSnapshot[] {
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(DRAFT_FIELD_SELECTOR))
    .map((field) => ({
      tagName: field.tagName,
      type: field instanceof HTMLInputElement ? field.type : null,
      id: field.id || null,
      name: field.getAttribute("name"),
      value: field.value,
      checked: field instanceof HTMLInputElement ? field.checked : undefined,
      autocomplete: field.getAttribute("autocomplete"),
    }));
}

function findDraftField(draft: StoredFormDraft) {
  if (draft.key.startsWith("#")) {
    return document.getElementById(draft.key.slice(1));
  }

  if (draft.key.startsWith("[name]")) {
    const name = draft.key.slice("[name]".length);
    const matches = Array.from(document.getElementsByName(name));
    if (typeof draft.checked === "boolean") {
      return matches.find((field) => (field as HTMLInputElement).value === draft.value) ?? null;
    }
    return matches[0] ?? null;
  }

  return null;
}

// Sets the value through the native setter so React-controlled fields see the change.
function restoreDrafts(drafts: StoredFormDraft[]) {
  for (const draft of drafts) {
    const field = findDraftField(draft);
    if (!isEditableField(field)) {
      continue;
    }

    if (field instanceof HTMLInputElement && typeof draft.checked === "boolean") {
      if (field.checked !== draft.checked) {
        field.click();
      }
      continue;
    }

    if (field.value === draft.value) {
      continue;
    }

    const prototype = Object.getPrototypeOf(field) as object;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) {
      setter.call(field, draft.value);
    } else {
      field.value = draft.value;
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function restoreReloadState(reloadState: StoredAppUpdateReloadState) {
  let attempts = 0;
  const restore = () => {
    window.scrollTo({ left: reloadState.scrollX, top: reloadState.scrollY, behavior: "auto" });
    document.scrollingElement?.scrollTo({ left: reloadState.scrollX, top: reloadState.scrollY, behavior: "auto" });
    if (attempts === 0 && reloadState.drafts?.length) {
      restoreDrafts(reloadState.drafts);
    }
    attempts += 1;

    if (attempts >= SCROLL_RESTORE_ATTEMPTS) {
      return;
    }

    if (Math.abs(window.scrollY - reloadState.scrollY) <= 4) {
      return;
    }

    window.setTimeout(() => {
      window.requestAnimationFrame(restore);
    }, SCROLL_RESTORE_RETRY_MS);
  };

  window.requestAnimationFrame(restore);
}

export function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // The old post-update toast is gone; clear its leftover marker.
      window.sessionStorage.removeItem(APP_UPDATE_NOTICE_KEY);

      const rawReloadState = window.sessionStorage.getItem(APP_UPDATE_RELOAD_STATE_KEY);
      const reloadState = parseStoredAppUpdateReloadState(rawReloadState);
      window.sessionStorage.removeItem(APP_UPDATE_RELOAD_STATE_KEY);

      if (!reloadState || !shouldRestoreReloadState(reloadState.href, window.location.href)) {
        return;
      }

      restoreReloadState(reloadState);
    } catch {
      // Ignore storage failures and keep the app usable.
    }
  }, []);

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

    // Silent update: the new build applies only when the page is hidden, on a
    // cold launch, or on a full navigation the person started. No overlay, no
    // toast, and never a reload of a visible page (see src/lib/app-update-policy.ts).
    const bootAt = Date.now();
    let cancelled = false;
    let applying = false;
    let hasInteracted = false;
    const dirtyFields = new Set<Element>();
    let registrationRef: ServiceWorkerRegistration | null = null;
    let pendingBuildId: string | null = null;
    let belowMinBuild = false;
    let requiredSinceMs: number | null = null;
    let teardown: (() => void) | null = null;

    const publishStatus = (phase: "idle" | "checking" | "update-queued" | "applying-update" | "error") => {
      publishAppUpdateStatus({
        currentBuildId: CURRENT_APP_BUILD_ID,
        phase,
        remoteBuildId: pendingBuildId,
        route: window.location.pathname,
        serviceWorkerControlled: Boolean(navigator.serviceWorker.controller),
        updatedAt: Date.now(),
      });
    };

    publishStatus("checking");

    const activeSessionId = () => {
      const match = /^\/session\/([^/?#]+)/.exec(window.location.pathname);
      if (match) {
        return match[1];
      }

      try {
        return readActiveSessionHint()?.sessionId ?? null;
      } catch {
        return null;
      }
    };

    const decide = (boundary: AppUpdateBoundary) => decideAppUpdateApply({
      boundary,
      updatePending: pendingBuildId !== null,
      activeSession: isActiveSessionRoute(window.location.pathname) || activeSessionId() !== null,
      dirtyInput: hasDirtyInput(),
      belowMinBuild,
      requiredSinceMs,
      now: Date.now(),
    });

    // Unsaved input counts only while the edited field is still on screen.
    const hasDirtyInput = () => {
      for (const field of dirtyFields) {
        if (!field.isConnected) {
          dirtyFields.delete(field);
        }
      }
      return dirtyFields.size > 0;
    };

    const promoteWaitingWorker = () => {
      registrationRef?.waiting?.postMessage({ type: "SKIP_WAITING" });
    };

    const rememberReloadState = () => {
      let drafts: StoredFormDraft[] = [];
      if (hasDirtyInput()) {
        try {
          drafts = collectFormDrafts(snapshotDraftFields());
        } catch {
          drafts = [];
        }
      }

      writeStorage(
        window.sessionStorage,
        APP_UPDATE_RELOAD_STATE_KEY,
        serializeStoredAppUpdateReloadState({
          href: window.location.href,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          targetBuildId: pendingBuildId,
          updatedAt: Date.now(),
          sessionId: activeSessionId(),
          drafts,
        }),
      );
    };

    // Returns true when the update is being applied (the caller must not continue).
    const tryApply = (boundary: AppUpdateBoundary, navigateTo?: string) => {
      if (cancelled || applying) {
        return applying;
      }

      const decision = decide(boundary);
      if (decision.action !== "apply") {
        if (pendingBuildId !== null && decision.reason !== "visible-page") {
          recordClientBootDiagnostic({
            tag: "[boot.service-worker]",
            source: "client",
            route: window.location.pathname,
            stage: `update-deferred-${decision.reason}`,
            buildId: CURRENT_APP_BUILD_ID,
            remoteBuildId: pendingBuildId,
          }, { level: "info" });
        }
        return false;
      }

      const now = Date.now();
      if (!shouldAttemptApply(readStorage(window.sessionStorage, APP_UPDATE_LAST_APPLY_KEY), CURRENT_APP_BUILD_ID, pendingBuildId, now)) {
        return false;
      }

      applying = true;
      writeStorage(window.sessionStorage, APP_UPDATE_LAST_APPLY_KEY, serializeApplyAttempt(CURRENT_APP_BUILD_ID, pendingBuildId, now));
      if (!navigateTo) {
        rememberReloadState();
      }
      publishStatus("applying-update");
      recordClientBootDiagnostic({
        tag: "[boot.service-worker]",
        source: "client",
        route: window.location.pathname,
        stage: `apply-update-${boundary}-${decision.reason}`,
        buildId: CURRENT_APP_BUILD_ID,
        remoteBuildId: pendingBuildId,
      });
      promoteWaitingWorker();

      if (navigateTo) {
        window.location.assign(navigateTo);
      } else {
        window.location.reload();
      }
      return true;
    };

    const markPending = (manifest: AppVersionManifest, remoteBuildId: string) => {
      pendingBuildId = remoteBuildId;
      belowMinBuild = isBelowMinBuild(CURRENT_APP_BUILD_ID, manifest);
      if (belowMinBuild) {
        const record = resolveRequiredSince(
          readStorage(window.localStorage, APP_UPDATE_REQUIRED_SINCE_KEY),
          CURRENT_APP_BUILD_ID,
          Date.now(),
        );
        requiredSinceMs = record.since;
        writeStorage(window.localStorage, APP_UPDATE_REQUIRED_SINCE_KEY, JSON.stringify(record));
      } else {
        requiredSinceMs = null;
      }
      publishStatus("update-queued");
    };

    const currentBoundary = (): AppUpdateBoundary => {
      if (document.visibilityState === "hidden") {
        return "hidden";
      }

      return isColdLaunchWindow(bootAt, Date.now(), hasInteracted) ? "cold-launch" : "visible";
    };

    const requestRegistrationUpdate = (registration: ServiceWorkerRegistration) => {
      void registration.update().catch(() => {
        // Keep the app usable even if an update check fails.
      });
    };

    const checkVersionManifest = async () => {
      try {
        const response = await fetch("/api/app-version", {
          cache: "no-store",
          headers: {
            "cache-control": "no-cache",
          },
        });
        if (!response.ok || cancelled) {
          return;
        }

        const manifest = await response.json() as AppVersionManifest;
        const remoteBuildId = manifest.buildId?.trim();
        if (!remoteBuildId || remoteBuildId === CURRENT_APP_BUILD_ID) {
          pendingBuildId = null;
          // The page already runs the latest build; an installed worker can take over silently.
          promoteWaitingWorker();
          publishStatus("idle");
          return;
        }

        if (pendingBuildId !== remoteBuildId) {
          recordClientBootDiagnostic({
            tag: "[boot.service-worker]",
            source: "client",
            route: window.location.pathname,
            stage: "remote-build-mismatch",
            buildId: CURRENT_APP_BUILD_ID,
            remoteBuildId,
          });
        }
        markPending(manifest, remoteBuildId);
        tryApply(currentBoundary());
      } catch {
        // Keep the app usable even if the version check fails.
      }
    };

    const isUsableRegistration = (registration: ServiceWorkerRegistration | null | undefined): registration is ServiceWorkerRegistration => (
      Boolean(registration)
      && typeof registration?.addEventListener === "function"
      && typeof registration?.update === "function"
    );

    const bindRegistration = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            // A new worker is ready; the version check decides whether the page needs the new build.
            void checkVersionManifest();
          }
        });
      });
    };

    // Never reloads: the worker is a network pass-through, so a new controller
    // does not change the running page. The page itself updates at a boundary.
    const handleControllerChange = () => {
      if (cancelled) {
        return;
      }

      recordClientBootDiagnostic({
        tag: "[boot.service-worker]",
        source: "client",
        route: window.location.pathname,
        stage: "controller-changed",
        buildId: CURRENT_APP_BUILD_ID,
        remoteBuildId: pendingBuildId,
      }, { level: "info" });
    };

    const handleVisibilityChange = (registration: ServiceWorkerRegistration) => {
      if (document.visibilityState === "hidden") {
        tryApply("hidden");
        return;
      }

      requestRegistrationUpdate(registration);
      void checkVersionManifest();
    };

    const recordInteraction = () => {
      hasInteracted = true;
    };

    const recordInput = (event: Event) => {
      if (isEditableField(event.target)) {
        dirtyFields.add(event.target);
      }
    };

    const clearDirtyInput = (event: Event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      for (const field of dirtyFields) {
        if (!form || form.contains(field)) {
          dirtyFields.delete(field);
        }
      }
    };

    // A same-origin link click while an update waits becomes a full navigation,
    // which loads the new build as part of the screen change the person asked for.
    const handleDocumentClick = (event: MouseEvent) => {
      if (pendingBuildId === null || event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) {
        return;
      }

      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      if (tryApply("navigation", url.href)) {
        event.preventDefault();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.register("/app-sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) {
          return;
        }

        if (!isUsableRegistration(registration)) {
          publishStatus("idle");
          recordClientBootDiagnostic({
            tag: "[boot.service-worker]",
            source: "client",
            route: typeof window !== "undefined" ? window.location.pathname : null,
            stage: "registration-unavailable",
            buildId: CURRENT_APP_BUILD_ID,
          }, {
            level: "info",
          });
          return;
        }

        registrationRef = registration;
        bindRegistration(registration);
        publishStatus("idle");
        requestRegistrationUpdate(registration);
        void checkVersionManifest();

        const intervalId = window.setInterval(() => {
          if (document.visibilityState === "visible") {
            requestRegistrationUpdate(registration);
            void checkVersionManifest();
          }
        }, UPDATE_POLL_INTERVAL_MS);

        const onVisibilityChange = () => handleVisibilityChange(registration);
        const onFocus = () => {
          requestRegistrationUpdate(registration);
          void checkVersionManifest();
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("focus", onFocus);
        window.addEventListener("pointerdown", recordInteraction, { passive: true });
        window.addEventListener("touchstart", recordInteraction, { passive: true });
        window.addEventListener("keydown", recordInteraction);
        document.addEventListener("input", recordInput, true);
        document.addEventListener("submit", clearDirtyInput, true);
        document.addEventListener("click", handleDocumentClick, true);

        return () => {
          window.clearInterval(intervalId);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("focus", onFocus);
          window.removeEventListener("pointerdown", recordInteraction);
          window.removeEventListener("touchstart", recordInteraction);
          window.removeEventListener("keydown", recordInteraction);
          document.removeEventListener("input", recordInput, true);
          document.removeEventListener("submit", clearDirtyInput, true);
          document.removeEventListener("click", handleDocumentClick, true);
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
      teardown?.();
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
