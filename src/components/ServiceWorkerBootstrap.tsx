"use client";

import { useEffect } from "react";

export function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Failed to register service worker", error);
    });
  }, []);

  return null;
}
