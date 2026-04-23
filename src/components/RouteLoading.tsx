"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";

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

export function RouteLoading({
  label = "Loading...",
  detail,
  variant = "route",
}: {
  label?: string;
  detail?: string;
  variant?: "boot" | "route";
}) {
  const isVisible = useDelayedVisible(variant === "boot" ? 0 : ROUTE_LOADING_DELAY_MS);

  if (!isVisible) {
    return null;
  }

  return (
    <section className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(71,215,196,0.1),transparent_22%),linear-gradient(180deg,rgba(3,9,16,0.08),rgba(3,9,16,0.22))]" />
      <div className="route-loading__grid" />
      <div className="route-loading__scan" />
      <div className="route-loading__glow left-[12%] top-[14%] h-44 w-44 bg-[rgb(var(--ambient-orb-one)/0.16)] [--route-loading-dx:14px] [--route-loading-dy:10px]" />
      <div className="route-loading__glow right-[12%] bottom-[14%] h-40 w-40 bg-[rgb(var(--ambient-orb-two)/0.14)] [--route-loading-dx:-12px] [--route-loading-dy:-10px]" style={{ animationDelay: "2200ms" }} />
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
  return <RouteLoading label="Loading tab..." />;
}
