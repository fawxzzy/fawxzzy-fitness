"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type VerticalScrollHintState = {
  canScrollTop: boolean;
  canScrollBottom: boolean;
  thumbTop: number;
  thumbHeight: number;
};

const INITIAL_STATE: VerticalScrollHintState = {
  canScrollTop: false,
  canScrollBottom: false,
  thumbTop: 0,
  thumbHeight: 100,
};

function resolveVerticalScrollHintState(element: HTMLElement): VerticalScrollHintState {
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
  if (maxScrollTop <= 1) {
    return INITIAL_STATE;
  }

  const scrollTop = Math.min(maxScrollTop, Math.max(0, element.scrollTop));
  const thumbHeight = Math.max(14, (element.clientHeight / element.scrollHeight) * 100);
  const thumbTravel = Math.max(0, 100 - thumbHeight);
  const thumbTop = (scrollTop / maxScrollTop) * thumbTravel;

  return {
    canScrollTop: scrollTop > 1,
    canScrollBottom: scrollTop < maxScrollTop - 1,
    thumbTop,
    thumbHeight,
  };
}

export function VerticalScrollHint({
  children,
  className,
  scrollClassName,
  contentClassName,
  railClassName,
  showFade = true,
  showRail = true,
}: {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  contentClassName?: string;
  railClassName?: string;
  showFade?: boolean;
  showRail?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<VerticalScrollHintState>(INITIAL_STATE);
  const hasOverflow = state.canScrollTop || state.canScrollBottom;

  const refresh = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }

    setState(resolveVerticalScrollHintState(element));
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) {
      return undefined;
    }

    refresh();
    element.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(refresh)
      : null;
    resizeObserver?.observe(element);
    if (element.firstElementChild) {
      resizeObserver?.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
      resizeObserver?.disconnect();
    };
  }, [refresh]);

  return (
    <div className={cn("relative min-h-0", className)}>
      <div
        ref={scrollerRef}
        className={cn(
          "hide-scrollbar min-h-0 overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch]",
          showRail ? "pr-2" : undefined,
          scrollClassName,
        )}
      >
        <div className={contentClassName}>
          {children}
        </div>
      </div>
      {showFade ? (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-[inherit] bg-[linear-gradient(180deg,rgb(var(--surface-rgb)/0.94),rgb(var(--surface-rgb)/0))] transition-opacity duration-150",
              state.canScrollTop ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-0 inset-x-0 h-7 rounded-b-[inherit] bg-[linear-gradient(0deg,rgb(var(--surface-rgb)/0.94),rgb(var(--surface-rgb)/0))] transition-opacity duration-150",
              state.canScrollBottom ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : null}
      {showRail && hasOverflow ? (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute bottom-2 right-0 top-2 w-[3px]", railClassName)}
        >
          <div className="absolute inset-y-0 left-px w-px rounded-full bg-[rgb(var(--accent-divider-rgb)/0.16)]" />
          <div
            className="absolute left-0 w-[3px] rounded-full bg-[rgb(var(--accent-divider-rgb)/0.96)] shadow-[0_0_10px_rgb(var(--accent-divider-rgb)/0.42)] transition-[top,height] duration-100"
            style={{
              top: `${state.thumbTop}%`,
              height: `${state.thumbHeight}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
