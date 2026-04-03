import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PickerListViewport({
  children,
  className,
  viewportClassName,
  showFade = true,
  constrainOnDesktop = false,
  plainOnMobile = false,
  mobileTray = false,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  showFade?: boolean;
  constrainOnDesktop?: boolean;
  plainOnMobile?: boolean;
  mobileTray?: boolean;
}) {
  const shouldShowDesktopFade = showFade && constrainOnDesktop;
  const shouldShowMobileFade = showFade && mobileTray;
  const shellClassName = plainOnMobile
    ? "overflow-visible rounded-none border-0 bg-transparent p-0 md:relative md:overflow-hidden md:rounded-[1.35rem] md:border md:border-border/45 md:bg-[rgb(var(--surface-2-soft)/0.42)] md:p-2"
    : "relative overflow-hidden rounded-[1.35rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-2";

  return (
    <div
      className={cn(
        shellClassName,
        mobileTray
          ? "relative max-md:overflow-hidden max-md:rounded-[1.05rem] max-md:border max-md:border-border/36 max-md:bg-[rgb(var(--surface-rgb)/0.2)] max-md:px-1.5 max-md:py-1.25"
          : undefined,
        className,
      )}
    >
      <div
        className={cn(
          "picker-scroll-viewport",
          plainOnMobile ? "overflow-visible pr-0 md:overflow-y-auto md:overscroll-contain md:pr-1" : "pr-1",
          mobileTray ? "max-md:max-h-[20.5rem] max-md:overflow-y-auto max-md:overscroll-contain max-md:pr-0.5" : undefined,
          constrainOnDesktop ? "md:max-h-[19rem] md:overflow-y-auto md:overscroll-contain" : undefined,
          viewportClassName,
        )}
      >
        {children}
      </div>
      {shouldShowMobileFade ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1.5 top-1.25 z-10 h-5 rounded-t-[0.8rem] bg-gradient-to-b from-[rgb(var(--surface-rgb)/0.8)] via-[rgb(var(--surface-rgb)/0.28)] to-transparent md:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1.5 bottom-1.25 z-10 h-7 rounded-b-[0.8rem] bg-gradient-to-t from-[rgb(var(--surface-rgb)/0.88)] via-[rgb(var(--surface-rgb)/0.5)] to-transparent md:hidden"
          />
        </>
      ) : null}
      {shouldShowDesktopFade ? (
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
