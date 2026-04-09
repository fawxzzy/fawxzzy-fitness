"use client";

import { useEffect } from "react";

export function InstallabilityBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Failed to register installability service worker", error);
    });
  }, []);

  return null;
}
