"use client";

import { useEffect } from "react";
import {
  buildFitnessLegacyOriginAnalyticsPayload,
  consumeFitnessLegacyOriginMarker,
} from "@/lib/legacy-origin-analytics";

const endpoint = process.env.NEXT_PUBLIC_FAWXZZY_ANALYTICS_URL;

export function LegacyOriginAnalytics() {
  useEffect(() => {
    const marker = consumeFitnessLegacyOriginMarker(window.location.href);
    if (!marker.matched) return;

    window.history.replaceState(null, "", marker.replacement);
    if (!endpoint) return;

    const body = JSON.stringify(buildFitnessLegacyOriginAnalyticsPayload());
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(endpoint, {
      body,
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
      mode: "cors",
    });
  }, []);

  return null;
}
