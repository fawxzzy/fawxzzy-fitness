"use client";

import { useEffect, useState } from "react";
import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";

const ROUTE_LOADING_DELAY_MS = 140;

export function RouteLoading({
  label = "Loading...",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, ROUTE_LOADING_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <section className="pointer-events-none fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(71,215,196,0.08)_0%,rgba(6,10,18,0.05)_34%,transparent_68%)]"
      />
      <div className="absolute inset-x-0 top-[max(18vh,6.5rem)] flex justify-center px-4">
        <div
          className="grid h-16 w-16 place-items-center rounded-full border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.46)] shadow-[0_12px_28px_rgba(0,0,0,0.16)] supports-[backdrop-filter]:backdrop-blur-[8px]"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">{detail ? `${label} ${detail}` : label}</span>
          <FawxzzySigilLoader size="sm" />
        </div>
      </div>
    </section>
  );
}
