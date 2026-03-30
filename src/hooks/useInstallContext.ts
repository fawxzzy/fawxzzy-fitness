"use client";

import { useEffect, useState } from "react";

export type InstallContext = {
  isStandalone: boolean;
  isBrowserMode: boolean;
  isDismissed: boolean;
  dismiss: () => void;
};

const DISMISS_KEY = "install-guidance-dismissed";
const DISMISS_EVENT = "install-guidance-dismissed-change";

function getStandaloneState() {
  if (typeof window === "undefined") {
    return false;
  }

  const mediaMatch = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const navigatorStandalone = typeof window.navigator !== "undefined" && "standalone" in window.navigator
    ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    : false;

  return mediaMatch || navigatorStandalone;
}

export function useInstallContext(): InstallContext {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const syncStandalone = () => setIsStandalone(getStandaloneState());
    const syncDismissed = () => {
      setIsDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    };

    syncStandalone();
    syncDismissed();

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleChange = () => syncStandalone();

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }
    }

    window.addEventListener("appinstalled", handleChange);
    window.addEventListener("storage", syncDismissed);
    window.addEventListener(DISMISS_EVENT, syncDismissed);

    return () => {
      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      }

      window.removeEventListener("appinstalled", handleChange);
      window.removeEventListener("storage", syncDismissed);
      window.removeEventListener(DISMISS_EVENT, syncDismissed);
    };
  }, []);

  return {
    isStandalone,
    isBrowserMode: !isStandalone,
    isDismissed,
    dismiss: () => {
      window.localStorage.setItem(DISMISS_KEY, "1");
      setIsDismissed(true);
      window.dispatchEvent(new Event(DISMISS_EVENT));
    },
  };
}
