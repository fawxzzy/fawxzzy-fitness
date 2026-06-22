"use client";

import { useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";
import {
  SCROLL_HINT_HORIZONTAL_THUMB_CLASS_NAME,
  SCROLL_HINT_HORIZONTAL_TRACK_CLASS_NAME,
} from "@/components/ui/scrollHintStyles";

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

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  (ref as { current: T }).current = value;
}

export function HorizontalScrollHint({
  children,
  className,
  scrollClassName,
  contentClassName,
  railClassName,
  scrollRef,
  scrollProps,
  contentProps,
  showRail = true,
  showEdgeFades = false,
}: {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  contentClassName?: string;
  railClassName?: string;
  scrollRef?: Ref<HTMLDivElement>;
  scrollProps?: (Omit<ComponentPropsWithoutRef<"div">, "children" | "ref"> & Record<string, unknown>);
  contentProps?: Omit<ComponentPropsWithoutRef<"div">, "children" | "ref">;
  showRail?: boolean;
  showEdgeFades?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<ScrollHintState>(INITIAL_STATE);
  const [hasOverflow, setHasOverflow] = useState(false);
  const { className: scrollPropsClassName, ...resolvedScrollProps } = scrollProps ?? {};
  const { className: contentPropsClassName, ...resolvedContentProps } = contentProps ?? {};

  const handleScrollerRef = useCallback((node: HTMLDivElement | null) => {
    scrollerRef.current = node;
    assignRef(scrollRef, node);
  }, [scrollRef]);

  const applyState = useCallback((nextState: ScrollHintState) => {
    stateRef.current = nextState;
    const nextHasOverflow = nextState.canScrollLeft || nextState.canScrollRight;
    setHasOverflow((current) => current === nextHasOverflow ? current : nextHasOverflow);

    if (thumbRef.current) {
      thumbRef.current.style.left = `${nextState.thumbLeft}%`;
      thumbRef.current.style.width = `${nextState.thumbWidth}%`;
    }
  }, []);

  const refresh = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }

    applyState(resolveScrollHintState(element));
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

  void showEdgeFades;

  return (
    <div className={cn("relative min-w-0", showRail ? "pb-2" : undefined, className)}>
      <div
        {...resolvedScrollProps}
        ref={handleScrollerRef}
        className={cn(
          "hide-scrollbar min-w-0 overflow-x-auto overflow-y-hidden [touch-action:pan-x] [-webkit-overflow-scrolling:touch]",
          scrollPropsClassName,
          scrollClassName,
        )}
      >
        <div
          {...resolvedContentProps}
          className={cn(contentPropsClassName, contentClassName)}
        >
          {children}
        </div>
      </div>
      {showRail && hasOverflow ? (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute bottom-0 left-1.5 right-1.5 h-[3px]", railClassName)}
        >
          <div className={SCROLL_HINT_HORIZONTAL_TRACK_CLASS_NAME} />
          <div
            ref={thumbRef}
            className={SCROLL_HINT_HORIZONTAL_THUMB_CLASS_NAME}
            style={{ left: "0%", width: "100%" }}
          />
        </div>
      ) : null}
    </div>
  );
}
