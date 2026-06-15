"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCROLL_HINT_VERTICAL_BOTTOM_FADE_CLASS_NAME,
  SCROLL_HINT_VERTICAL_THUMB_CLASS_NAME,
  SCROLL_HINT_VERTICAL_TOP_FADE_CLASS_NAME,
  SCROLL_HINT_VERTICAL_TRACK_CLASS_NAME,
} from "@/components/ui/scrollHintStyles";

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
  const topFadeRef = useRef<HTMLDivElement | null>(null);
  const bottomFadeRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<VerticalScrollHintState>(INITIAL_STATE);
  const [hasOverflow, setHasOverflow] = useState(false);

  const applyState = useCallback((nextState: VerticalScrollHintState) => {
    stateRef.current = nextState;
    const nextHasOverflow = nextState.canScrollTop || nextState.canScrollBottom;
    setHasOverflow((current) => current === nextHasOverflow ? current : nextHasOverflow);

    if (topFadeRef.current) {
      topFadeRef.current.style.opacity = nextState.canScrollTop ? "1" : "0";
    }

    if (bottomFadeRef.current) {
      bottomFadeRef.current.style.opacity = nextState.canScrollBottom ? "1" : "0";
    }

    if (thumbRef.current) {
      thumbRef.current.style.top = `${nextState.thumbTop}%`;
      thumbRef.current.style.height = `${nextState.thumbHeight}%`;
    }
  }, []);

  const refresh = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }

    applyState(resolveVerticalScrollHintState(element));
  }, [applyState]);

  const scheduleRefresh = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) {
      return undefined;
    }

    refresh();
    element.addEventListener("scroll", scheduleRefresh, { passive: true });
    window.addEventListener("resize", scheduleRefresh);

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(scheduleRefresh)
      : null;
    resizeObserver?.observe(element);
    if (element.firstElementChild) {
      resizeObserver?.observe(element.firstElementChild);
    }

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      element.removeEventListener("scroll", scheduleRefresh);
      window.removeEventListener("resize", scheduleRefresh);
      resizeObserver?.disconnect();
    };
  }, [refresh, scheduleRefresh]);

  useEffect(() => {
    if (hasOverflow) {
      refresh();
    }
  }, [hasOverflow, refresh]);

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
            ref={topFadeRef}
            aria-hidden="true"
            className={cn(SCROLL_HINT_VERTICAL_TOP_FADE_CLASS_NAME)}
          />
          <div
            ref={bottomFadeRef}
            aria-hidden="true"
            className={cn(SCROLL_HINT_VERTICAL_BOTTOM_FADE_CLASS_NAME)}
          />
        </>
      ) : null}
      {showRail && hasOverflow ? (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute bottom-2 right-0 top-2 w-[3px]", railClassName)}
        >
          <div className={SCROLL_HINT_VERTICAL_TRACK_CLASS_NAME} />
          <div
            ref={thumbRef}
            className={SCROLL_HINT_VERTICAL_THUMB_CLASS_NAME}
            style={{ top: "0%", height: "100%" }}
          />
        </div>
      ) : null}
    </div>
  );
}
