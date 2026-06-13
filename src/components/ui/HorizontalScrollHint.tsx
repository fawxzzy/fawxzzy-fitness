"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ScrollHintState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  thumbLeft: number;
  thumbWidth: number;
};

const INITIAL_STATE: ScrollHintState = {
  canScrollLeft: false,
  canScrollRight: false,
  thumbLeft: 0,
  thumbWidth: 100,
};

function resolveScrollHintState(element: HTMLElement): ScrollHintState {
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
  if (maxScrollLeft <= 1) {
    return INITIAL_STATE;
  }

  const scrollLeft = Math.min(maxScrollLeft, Math.max(0, element.scrollLeft));
  const thumbWidth = Math.max(16, (element.clientWidth / element.scrollWidth) * 100);
  const thumbTravel = Math.max(0, 100 - thumbWidth);
  const thumbLeft = (scrollLeft / maxScrollLeft) * thumbTravel;

  return {
    canScrollLeft: scrollLeft > 1,
    canScrollRight: scrollLeft < maxScrollLeft - 1,
    thumbLeft,
    thumbWidth,
  };
}

export function HorizontalScrollHint({
  children,
  className,
  scrollClassName,
  contentClassName,
  railClassName,
  showRail = true,
}: {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  contentClassName?: string;
  railClassName?: string;
  showRail?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ScrollHintState>(INITIAL_STATE);
  const hasOverflow = state.canScrollLeft || state.canScrollRight;

  const refresh = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }

    setState(resolveScrollHintState(element));
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
    <div className={cn("relative min-w-0", showRail ? "pb-2" : undefined, className)}>
      <div
        ref={scrollerRef}
        className={cn(
          "hide-scrollbar min-w-0 overflow-x-auto overflow-y-visible [touch-action:pan-x] [-webkit-overflow-scrolling:touch]",
          scrollClassName,
        )}
      >
        <div className={contentClassName}>
          {children}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-2 left-0 top-0 w-7 rounded-l-[inherit] bg-[linear-gradient(90deg,rgb(var(--surface-rgb)/0.94),rgb(var(--surface-rgb)/0))] transition-opacity duration-150",
          state.canScrollLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-2 right-0 top-0 w-7 rounded-r-[inherit] bg-[linear-gradient(270deg,rgb(var(--surface-rgb)/0.94),rgb(var(--surface-rgb)/0))] transition-opacity duration-150",
          state.canScrollRight ? "opacity-100" : "opacity-0",
        )}
      />
      {showRail && hasOverflow ? (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute bottom-0 left-1.5 right-1.5 h-[3px]", railClassName)}
        >
          <div className="h-px translate-y-px rounded-full bg-[rgb(var(--accent-divider-rgb)/0.18)]" />
          <div
            className="absolute top-0 h-[3px] rounded-full bg-[rgb(var(--accent-divider-rgb)/0.96)] shadow-[0_0_10px_rgb(var(--accent-divider-rgb)/0.42)] transition-[left,width] duration-100"
            style={{
              left: `${state.thumbLeft}%`,
              width: `${state.thumbWidth}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
