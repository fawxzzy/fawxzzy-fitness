"use client";

import { useEffect, useState } from "react";
import {
  getInstallSnapshot,
  getStandaloneState,
  type InstallCapability,
  type InstallPlatform,
  type ManualInstallInstructions,
} from "@/lib/install/install-detection";

export type InstallContext = {
  capability: InstallCapability;
  isReady: boolean;
  isStandalone: boolean;
  isBrowserMode: boolean;
  manualInstructions: ManualInstallInstructions | null;
  nativePromptAvailable: boolean;
  platform: InstallPlatform;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export function useInstallContext(): InstallContext {
  const [isReady, setIsReady] = useState(false);
  const [snapshot, setSnapshot] = useState(() =>
    getInstallSnapshot({
      userAgent: "",
      isStandalone: false,
    }),
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const syncInstallSnapshot = () => {
      const nextSnapshot = getInstallSnapshot({
        userAgent: window.navigator.userAgent,
        isStandalone: getStandaloneState(),
      });

      setSnapshot((currentSnapshot) => {
        if (
          currentSnapshot.isStandalone === nextSnapshot.isStandalone
          && currentSnapshot.platform === nextSnapshot.platform
          && currentSnapshot.capability === nextSnapshot.capability
          && currentSnapshot.manualInstructions?.ctaLabel === nextSnapshot.manualInstructions?.ctaLabel
        ) {
          return currentSnapshot;
        }

        return nextSnapshot;
      });
      setIsReady(true);
    };

    syncInstallSnapshot();

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

  const nativePromptAvailable = snapshot.capability === "native-prompt" && deferredPrompt !== null;

  return {
    capability: snapshot.capability,
    isReady,
    isStandalone: snapshot.isStandalone,
    isBrowserMode: isReady && !snapshot.isStandalone,
    manualInstructions: snapshot.manualInstructions,
    nativePromptAvailable,
    platform: snapshot.platform,
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
