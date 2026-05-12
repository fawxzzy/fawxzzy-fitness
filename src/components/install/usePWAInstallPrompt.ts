"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setDismissedForSession(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setDismissedForSession(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt || dismissedForSession || isPrompting) {
      return "unavailable" as const;
    }

    setIsPrompting(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        return "accepted" as const;
      }

      setDismissedForSession(true);
      setDeferredPrompt(null);
      return "dismissed" as const;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt, dismissedForSession, isPrompting]);

  return {
    canPromptInstall: Boolean(deferredPrompt) && !dismissedForSession && !isInstalled,
    dismissedForSession,
    isInstalled,
    isPrompting,
    promptInstall,
  };
}
