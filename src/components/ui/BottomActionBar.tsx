"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_CONTENT_PADDING_CLASS = "pb-[var(--app-bottom-offset)]";

function parseCssPx(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function BottomActionBar({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const shellRoot = panel.closest(".app-shell") as HTMLElement | null;
    const target = shellRoot ?? document.documentElement;

    const updateHeight = () => {
      const rootStyles = window.getComputedStyle(target);
      const panelHeight = panel.getBoundingClientRect().height;
      const safeAreaInsetBottom = parseCssPx(rootStyles.getPropertyValue("--app-bottom-inset"));
      const gap = parseCssPx(rootStyles.getPropertyValue("--app-bottom-gap"));
      const visibleHeight = Math.max(0, panelHeight - (safeAreaInsetBottom + gap));
      target.style.setProperty("--app-bottom-bar-height", `${visibleHeight}px`);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(panel);
    updateHeight();

    return () => {
      resizeObserver.disconnect();
      target.style.setProperty("--app-bottom-bar-height", "0px");
    };
  }, []);

  return (
    <div className={cn("app-bottom-action-bar pointer-events-none fixed inset-x-0 bottom-0 z-50", className)}>
      <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
        <div
          ref={panelRef}
          className={cn(
            "flex items-center justify-center gap-3 rounded-2xl border border-[rgb(var(--glass-tint-rgb)/0.34)] bg-[rgb(var(--glass-tint-rgb)/0.72)] px-3 pt-3 pb-[calc(var(--app-bottom-inset)+var(--app-bottom-gap))] shadow-[0_10px_24px_rgb(0_0_0/0.32)] backdrop-blur-md",
            "[&>*]:min-h-[44px] [&>*]:flex-1",
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
