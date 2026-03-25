import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PickerListViewport({
  children,
  className,
  viewportClassName,
  showFade = true,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  showFade?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[1.35rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-2", className)}>
      <div
        className={cn(
          "picker-scroll-viewport max-h-[19rem] overflow-y-auto overscroll-contain pr-1",
          viewportClassName,
        )}
      >
        {children}
      </div>
      {showFade ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-2 z-10 h-8 rounded-t-[1rem] bg-gradient-to-b from-[rgb(var(--surface-rgb)/0.82)] via-[rgb(var(--surface-rgb)/0.3)] to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 bottom-2 z-10 h-12 rounded-b-[1rem] bg-gradient-to-t from-[rgb(var(--surface-rgb)/0.92)] via-[rgb(var(--surface-rgb)/0.55)] to-transparent" />
        </>
      ) : null}
    </div>
  );
}
