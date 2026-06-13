"use client";

import type { ReactNode } from "react";
import { VerticalScrollHint } from "@/components/ui/VerticalScrollHint";
import { cn } from "@/lib/cn";

export const filterScrollPanelChromeClassName =
  "relative overflow-hidden rounded-[0.95rem] bg-[rgb(var(--surface-1-rgb)/0.28)]";

export const filterScrollViewportClassName =
  "filter-scroll-viewport overflow-y-auto overscroll-contain touch-pan-y py-1 pr-1";

export function FilterScrollPanel({
  children,
  className,
  viewportClassName,
  showEdgeFades = false,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  showEdgeFades?: boolean;
}) {
  return (
    <div className={cn(filterScrollPanelChromeClassName, className)}>
      <VerticalScrollHint
        scrollClassName={cn(filterScrollViewportClassName, viewportClassName)}
        showFade={showEdgeFades}
        showRail={showEdgeFades}
      >
        {children}
      </VerticalScrollHint>
    </div>
  );
}
