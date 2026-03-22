"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

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

    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, router]);

  return null;
}
