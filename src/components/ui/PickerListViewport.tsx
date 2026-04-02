import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PickerListViewport({
  children,
  className,
  viewportClassName,
  showFade = true,
  constrainOnDesktop = false,
  plainOnMobile = false,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  showFade?: boolean;
  constrainOnDesktop?: boolean;
  plainOnMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        plainOnMobile
          ? "relative md:overflow-hidden md:rounded-[1.35rem] md:border md:border-border/45 md:bg-[rgb(var(--surface-2-soft)/0.42)] md:p-2"
          : "relative overflow-hidden rounded-[1.35rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-2",
        className,
      )}
    >
      <div
        className={cn(
          "picker-scroll-viewport",
          plainOnMobile ? "pr-0 md:pr-1" : "pr-1",
          constrainOnDesktop ? "md:max-h-[19rem] md:overflow-y-auto md:overscroll-contain" : undefined,
          viewportClassName,
        )}
      >
        {children}
      </div>
      {showFade && constrainOnDesktop ? (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-2 top-2 z-10 hidden h-8 rounded-t-[1rem] bg-gradient-to-b from-[rgb(var(--surface-rgb)/0.82)] via-[rgb(var(--surface-rgb)/0.3)] to-transparent md:block",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-2 bottom-2 z-10 hidden h-12 rounded-b-[1rem] bg-gradient-to-t from-[rgb(var(--surface-rgb)/0.92)] via-[rgb(var(--surface-rgb)/0.55)] to-transparent md:block",
            )}
          />
        </>
      ) : null}
    </div>
  );
}
