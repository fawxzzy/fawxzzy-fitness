"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";

const ROUTE_LOADING_DELAY_MS = 260;
const LOADING_PARTICLES = [
  { left: "18%", top: "22%", dx: "10px", dy: "24px", duration: "16s", delay: "0ms" },
  { left: "74%", top: "18%", dx: "-12px", dy: "28px", duration: "19s", delay: "1400ms" },
  { left: "84%", top: "62%", dx: "-10px", dy: "18px", duration: "15s", delay: "700ms" },
  { left: "26%", top: "74%", dx: "12px", dy: "22px", duration: "21s", delay: "1800ms" },
  { left: "56%", top: "82%", dx: "-8px", dy: "16px", duration: "18s", delay: "3200ms" },
  { left: "44%", top: "16%", dx: "6px", dy: "14px", duration: "17s", delay: "900ms" },
] as const;

function useDelayedVisible(delayMs: number) {
  const [isVisible, setIsVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) {
      setIsVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return isVisible;
}

function setRouteLoadingChromeHidden(isActive: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const currentCount = Number.parseInt(root.dataset.routeLoadingCount ?? "0", 10);
  const safeCount = Number.isFinite(currentCount) ? currentCount : 0;

  if (isActive) {
    const nextCount = safeCount + 1;
    root.dataset.routeLoadingCount = String(nextCount);
    root.dataset.routeLoading = "true";
    return;
  }

  const nextCount = Math.max(0, safeCount - 1);
  if (nextCount === 0) {
    delete root.dataset.routeLoadingCount;
    delete root.dataset.routeLoading;
    return;
  }

  root.dataset.routeLoadingCount = String(nextCount);
}

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
  variant?: "boot" | "route";
  gateName?: string;
  blockingReason?: string;
  timeoutMs?: number;
}) {
  const isVisible = useDelayedVisible(variant === "boot" ? 0 : ROUTE_LOADING_DELAY_MS);
  const gateRef = useRef<ReturnType<typeof startLoadingDiagnosticGate> | null>(null);

  useEffect(() => {
    if (!gateName) {
      return;
    }

    gateRef.current = startLoadingDiagnosticGate({
      gate: gateName,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      source: "client",
      blockingReason: blockingReason ?? detail ?? label,
      metadata: {
        variant,
        detail: detail ?? null,
        label,
      },
      timeoutMs: timeoutMs ?? (variant === "boot" ? 5000 : 3500),
    });

    return () => {
      gateRef.current?.resolve({
        blockingReason: "Route loading overlay unmounted.",
      });
      gateRef.current = null;
    };
  }, [blockingReason, detail, gateName, label, timeoutMs, variant]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setRouteLoadingChromeHidden(true);

    return () => {
      setRouteLoadingChromeHidden(false);
    };
  }, [isVisible]);

  useEffect(() => {
    gateRef.current?.pending({
      blockingReason: blockingReason ?? detail ?? label,
      metadata: {
        variant,
        visible: isVisible,
      },
    });
  }, [blockingReason, detail, isVisible, label, variant]);

  if (!isVisible) {
    return null;
  }

  return (
    <section className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgb(var(--loader-scan-rgb)/0.18),transparent_22%),linear-gradient(180deg,rgba(3,9,16,0.08),rgba(3,9,16,0.22))]" />
      <div className="route-loading__grid" />
      <div className="route-loading__scan" />
      <div className="route-loading__glow left-[12%] top-[14%] h-44 w-44 bg-[rgb(var(--loader-scan-rgb)/0.24)] [--route-loading-dx:14px] [--route-loading-dy:10px]" />
      <div className="route-loading__glow right-[12%] bottom-[14%] h-40 w-40 bg-[rgb(var(--loader-scan-rgb)/0.18)] [--route-loading-dx:-12px] [--route-loading-dy:-10px]" style={{ animationDelay: "2200ms" }} />
      {LOADING_PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}-${variant}`}
          className="route-loading__particle"
          style={{
            left: particle.left,
            top: particle.top,
            "--route-loading-particle-dx": particle.dx,
            "--route-loading-particle-dy": particle.dy,
            "--route-loading-duration": particle.duration,
            "--route-loading-delay": particle.delay,
          } as CSSProperties}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="grid place-items-center" role="status" aria-live="polite">
          <span className="sr-only">{detail ? `${label} ${detail}` : label}</span>
          <FawxzzySigilLoader size="xl" />
        </div>
      </div>
    </section>
  );
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
