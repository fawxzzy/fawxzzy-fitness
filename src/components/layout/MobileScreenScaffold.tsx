"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { BottomActionsProvider, BottomActionsSlot } from "@/components/layout/bottom-actions";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { cn } from "@/lib/cn";

type MobileScreenScaffoldProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function MobileScreenScaffold({
  children,
  topChrome,
  bottomDock,
  className,
  scrollClassName,
}: MobileScreenScaffoldProps) {
  const topChromeRef = useRef<HTMLDivElement | null>(null);
  const [topChromeHeight, setTopChromeHeight] = useState(0);

  useEffect(() => {
    const node = topChromeRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      setTopChromeHeight(node?.getBoundingClientRect().height ?? 0);
      return;
    }

    const syncHeight = () => {
      const nextHeight = node.getBoundingClientRect().height;
      setTopChromeHeight(Math.ceil(nextHeight));
    };

    syncHeight();

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [topChrome]);

  return (
    <BottomActionsProvider>
      <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
        {topChrome ? (
          <div ref={topChromeRef} className="pointer-events-auto absolute inset-x-0 top-0 z-30">
            {topChrome}
          </div>
        ) : null}

        <ScrollContainer
          className={cn(FIXED_CTA_RESERVE_CLASS, scrollClassName)}
          style={{ "--app-mobile-top-chrome-height": `${topChromeHeight}px` } as CSSProperties}
        >
          <div style={{ paddingTop: topChromeHeight }}>
            {children}
          </div>
          {bottomDock ? bottomDock : <BottomActionsSlot />}
        </ScrollContainer>
      </div>
    </BottomActionsProvider>
  );
}
