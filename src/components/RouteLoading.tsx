"use client";

import { useEffect, useRef } from "react";
import { acquireLoaderWait } from "@/lib/app-loader-controller";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";
import { getRouteLoadingDiagnosticTimeoutMs, type RouteLoadingVariant } from "@/lib/route-loading";

/**
 * Marks "this screen is waiting" while it is mounted. It draws nothing and owns no timer: the single
 * <AppLoaderHost> in the root layout decides whether, when and how the loader shows (src/lib/app-loader.ts), so a
 * route's loading.tsx, a Suspense fallback and an entry gate all share one delay, one minimum hold and one fade.
 * `variant` no longer changes timing; it only picks the default diagnostics timeout.
 */
export function RouteLoading({
  label = "Loading...",
  detail,
  variant = "route",
  gateName,
  blockingReason,
  timeoutMs,
}: {
  label?: string;
  detail?: string;
  variant?: RouteLoadingVariant;
  gateName?: string;
  blockingReason?: string;
  timeoutMs?: number;
}) {
  const announced = detail ? `${label} ${detail}` : label;

  useEffect(() => acquireLoaderWait(announced), [announced]);

  // Diagnostics gate: started once per mounted gate, with the latest copy read at start time.
  const latest = useRef({ label, detail, blockingReason, variant });
  latest.current = { label, detail, blockingReason, variant };

  useEffect(() => {
    if (!gateName) {
      return;
    }

    const current = latest.current;
    const gate = startLoadingDiagnosticGate({
      gate: gateName,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      source: "client",
      blockingReason: current.blockingReason ?? current.detail ?? current.label,
      metadata: {
        variant: current.variant,
        detail: current.detail ?? null,
        label: current.label,
      },
      timeoutMs: timeoutMs ?? getRouteLoadingDiagnosticTimeoutMs(current.variant),
    });

    return () => {
      gate.resolve({
        blockingReason: "Route loading overlay unmounted.",
      });
    };
  }, [gateName, timeoutMs]);

  return null;
}

export function RouteTabLoading() {
  return (
    <RouteLoading
      label="Loading tab..."
      gateName="route.tab-loading"
      blockingReason="Waiting for the selected tab route to render."
    />
  );
}
