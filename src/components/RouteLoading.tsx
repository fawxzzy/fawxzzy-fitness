"use client";

import { useEffect, useState } from "react";
import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";

const ROUTE_LOADING_DELAY_MS = 260;

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

  if (variant === "route") {
    return (
      <section className="pointer-events-none fixed inset-0 z-50">
        <div className="absolute inset-x-0 top-[max(18vh,6.5rem)] flex justify-center px-4">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-1-rgb)/0.32)] shadow-[0_10px_24px_rgba(0,0,0,0.12)] supports-[backdrop-filter]:backdrop-blur-[6px]">
            <span className="sr-only">{detail ? `${label} ${detail}` : label}</span>
            <FawxzzySigilLoader size="sm" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pointer-events-none fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(71,215,196,0.08)_0%,rgba(6,10,18,0.05)_34%,transparent_68%)]"
      />
      <div className="absolute inset-x-0 top-[max(18vh,6.5rem)] flex justify-center px-4">
        <div
          className="grid min-h-28 w-full max-w-[18rem] place-items-center gap-2 rounded-[1.6rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.46)] px-5 py-4 text-center shadow-[0_12px_28px_rgba(0,0,0,0.16)] supports-[backdrop-filter]:backdrop-blur-[8px]"
          role="status"
          aria-live="polite"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.52)]">
            <FawxzzySigilLoader size="sm" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[rgb(var(--text)/0.96)]">{label}</p>
            {detail ? <p className="text-xs leading-relaxed text-[rgb(var(--text-muted)/0.96)]">{detail}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
