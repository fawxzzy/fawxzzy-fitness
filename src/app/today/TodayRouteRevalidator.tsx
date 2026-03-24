"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ACTIVE_SESSION_EVENT } from "@/lib/session-state-sync";

export function TodayRouteRevalidator() {
  const router = useRouter();
  const pathname = usePathname();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (pathname !== "/today") {
      return;
    }

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 700) {
        return;
      }
      lastRefreshAtRef.current = now;
      router.refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    refresh();

    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("popstate", refresh);
    window.addEventListener(ACTIVE_SESSION_EVENT, refresh as EventListener);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener(ACTIVE_SESSION_EVENT, refresh as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, router]);

  return null;
}
