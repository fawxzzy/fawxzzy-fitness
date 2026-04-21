"use client";

import { useEffect, useLayoutEffect } from "react";
import { getStandaloneState } from "@/lib/install/install-detection";

function syncDisplayMode() {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.displayMode = getStandaloneState() ? "standalone" : "browser";
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
