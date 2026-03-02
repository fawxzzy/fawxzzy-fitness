"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type ScrollFadeProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const MASK = "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)";

export function ScrollFade({ children, className, contentClassName }: ScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [showFade, setShowFade] = useState(false);

  const measure = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const isScrollable = node.scrollHeight > node.clientHeight + 1;
    const isAtBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
    const nextShowFade = isScrollable && !isAtBottom;

    setShowFade((prev) => (prev === nextShowFade ? prev : nextShowFade));
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    measure();

    const onScroll = () => {
      if (frameRef.current !== null) return;

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        measure();
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(node);
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [measure]);

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        ref={scrollRef}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]", contentClassName)}
        style={showFade ? { WebkitMaskImage: MASK, maskImage: MASK, WebkitOverflowScrolling: "touch" } : { WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>
      {showFade ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[rgb(var(--surface-2-soft)/0.98)] to-transparent"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
