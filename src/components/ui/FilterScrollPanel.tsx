import type { ReactNode } from "react";
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
      {showEdgeFades ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-5 bg-gradient-to-b from-[rgb(var(--surface-1-rgb)/0.86)] via-[rgb(var(--surface-1-rgb)/0.42)] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-7 bg-gradient-to-t from-[rgb(var(--surface-1-rgb)/0.92)] via-[rgb(var(--surface-1-rgb)/0.56)] to-transparent" />
        </>
      ) : null}
      <div className={cn(filterScrollViewportClassName, viewportClassName)}>
        {children}
      </div>
    </div>
  );
}
