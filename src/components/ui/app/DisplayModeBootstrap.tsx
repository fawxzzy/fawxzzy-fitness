"use client";

import { useEffect, useLayoutEffect } from "react";
import {
  mergeAppBootPreferences,
  resolveAppBootPreferences,
  type AppBootDisplayMode,
} from "@/lib/app-boot-preferences";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function getDisplayMode(): AppBootDisplayMode {
  if (typeof window === "undefined") {
    return "browser";
  }

  const mediaMatch = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const navigatorStandalone = Boolean((window.navigator as NavigatorWithStandalone).standalone);

  return mediaMatch || navigatorStandalone ? "standalone" : "browser";
}

function syncDisplayMode() {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const nextDisplayMode = getDisplayMode();
  const currentBootPreferences = resolveAppBootPreferences({
    cookieString: document.cookie,
  });
  const shouldUpdateDataset = root.dataset.displayMode !== nextDisplayMode;
  const shouldUpdateSnapshot = currentBootPreferences?.displayMode !== nextDisplayMode;

  if (!shouldUpdateDataset && !shouldUpdateSnapshot) {
    return;
  }

  if (shouldUpdateDataset) {
    root.dataset.displayMode = nextDisplayMode;
  }

  if (shouldUpdateSnapshot) {
    mergeAppBootPreferences({
      displayMode: nextDisplayMode,
    });
  }
}

export function DisplayModeBootstrap() {
  useLayoutEffect(() => {
    syncDisplayMode();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      syncDisplayMode();
    };

    window.addEventListener("pageshow", handleDisplayModeChange);
    window.addEventListener("focus", handleDisplayModeChange);

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleDisplayModeChange);
      } else {
        mediaQuery.addListener(handleDisplayModeChange);
      }
    }

    return () => {
      window.removeEventListener("pageshow", handleDisplayModeChange);
      window.removeEventListener("focus", handleDisplayModeChange);

      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", handleDisplayModeChange);
        } else {
          mediaQuery.removeListener(handleDisplayModeChange);
        }
      }
    };
  }, []);

  return null;
}
