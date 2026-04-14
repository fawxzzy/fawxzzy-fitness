"use client";

import { useEffect, useState } from "react";
import {
  areInstallSnapshotsEqual,
  getBrowserInstallSnapshot,
  getInstallSnapshot,
  INSTALL_BOOTSTRAP_TIMEOUT_MS,
  type InstallCapability,
  type InstallBootstrapStatus,
  type InstallPrimaryAction,
  type InstallPlatform,
  type ManualInstallInstructions,
  resolveInstallBootstrapSnapshot,
  resolveInstallBootstrapTimeoutStatus,
  resolveInstallPrimaryAction,
} from "@/lib/install/install-detection";

export type InstallContext = {
  bootstrapStatus: InstallBootstrapStatus;
  capability: InstallCapability;
  isReady: boolean;
  isStandalone: boolean;
  isBrowserMode: boolean;
  manualInstructions: ManualInstallInstructions | null;
  nativePromptAvailable: boolean;
  platform: InstallPlatform;
  primaryAction: InstallPrimaryAction | null;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type InstallBootstrapState = {
  status: InstallBootstrapStatus;
  snapshot: ReturnType<typeof getInstallSnapshot>;
};

export function useInstallContext(): InstallContext {
  const [installState, setInstallState] = useState<InstallBootstrapState>(() => ({
    status: "checking",
    snapshot: getInstallSnapshot({
      userAgent: "",
      isStandalone: false,
    }),
  }));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const syncInstallSnapshot = () => {
      try {
        const nextInstallState = resolveInstallBootstrapSnapshot();

        setInstallState((currentState) => {
          if (
            currentState.status === nextInstallState.status
            && areInstallSnapshotsEqual(currentState.snapshot, nextInstallState.snapshot)
          ) {
            return currentState;
          }

          return nextInstallState;
        });
      } catch {
        const fallbackSnapshot = getBrowserInstallSnapshot(window.navigator.userAgent);

        setInstallState((currentState) => {
          if (
            currentState.status === "error"
            && areInstallSnapshotsEqual(currentState.snapshot, fallbackSnapshot)
          ) {
            return currentState;
          }

          return {
            status: "error",
            snapshot: fallbackSnapshot,
          };
        });
      }
    };

    syncInstallSnapshot();
    const bootstrapTimeout = window.setTimeout(() => {
      const fallbackSnapshot = getBrowserInstallSnapshot(window.navigator.userAgent);

      setInstallState((currentState) => {
        const nextStatus = resolveInstallBootstrapTimeoutStatus(currentState.status);

        if (nextStatus === currentState.status) {
          return currentState;
        }

        return {
          status: nextStatus,
          snapshot: fallbackSnapshot,
        };
      });
    }, INSTALL_BOOTSTRAP_TIMEOUT_MS);

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      syncInstallSnapshot();
      setDeferredPrompt(null);
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      syncInstallSnapshot();
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      syncInstallSnapshot();
    };

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleDisplayModeChange);
      } else {
        mediaQuery.addListener(handleDisplayModeChange);
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(bootstrapTimeout);

      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", handleDisplayModeChange);
        } else {
          mediaQuery.removeListener(handleDisplayModeChange);
        }
      }

      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const bootstrapStatus = installState.status;
  const snapshot = installState.snapshot;
  const nativePromptAvailable = snapshot.capability === "native-prompt" && deferredPrompt !== null;
  const primaryAction = resolveInstallPrimaryAction({
    isStandalone: snapshot.isStandalone,
    manualInstructions: snapshot.manualInstructions,
    nativePromptAvailable,
    platform: snapshot.platform,
  });

  return {
    bootstrapStatus,
    capability: snapshot.capability,
    isReady: bootstrapStatus !== "checking",
    isStandalone: snapshot.isStandalone,
    isBrowserMode: bootstrapStatus === "browser" || bootstrapStatus === "error",
    manualInstructions: snapshot.manualInstructions,
    nativePromptAvailable,
    platform: snapshot.platform,
    primaryAction,
    promptInstall: async () => {
      if (!deferredPrompt) {
        return "unavailable";
      }

      const promptEvent = deferredPrompt;
      setDeferredPrompt(null);

      await promptEvent.prompt();

      try {
        const choice = await promptEvent.userChoice;
        return choice.outcome;
      } catch {
        return "dismissed";
      }
    },
  };
}
