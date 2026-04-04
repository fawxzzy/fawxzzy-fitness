"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { BottomActionsProvider, BottomActionsSlot } from "@/components/layout/bottom-actions";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { cn } from "@/lib/cn";

type MobileScreenShellProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function MobileScreenShell({
  children,
  topChrome,
  bottomDock,
  className,
  scrollClassName,
}: MobileScreenShellProps) {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockHeight, setDockHeight] = useState(0);

  useEffect(() => {
    const node = dockRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      setDockHeight(node?.getBoundingClientRect().height ?? 0);
      return;
    }

    const syncHeight = () => {
      setDockHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    syncHeight();

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [bottomDock]);

  return (
    <BottomActionsProvider>
      <section className={cn("relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden", className)}>
        {topChrome ? <div className="z-30 flex-none pt-[var(--app-top-nav-safe-top,var(--app-safe-top))]">{topChrome}</div> : null}

        <ScrollContainer
          className={cn("min-h-0 flex-1", scrollClassName)}
          style={{ "--app-mobile-bottom-dock-height": `${dockHeight}px` } as CSSProperties}
        >
          <div
            className={cn(
              "min-w-0 max-w-full overflow-x-hidden pb-[calc(var(--app-mobile-bottom-dock-height,0px)+var(--app-mobile-dock-clearance-gap,0px))]",
              topChrome ? "pt-[var(--app-top-chrome-content-gap,8px)]" : "",
            )}
          >
            {children}
          </div>
        </ScrollContainer>

        <div ref={dockRef} className="z-40 flex-none">
          {bottomDock ? bottomDock : <BottomActionsSlot />}
        </div>
      </section>
    </BottomActionsProvider>
  );
}
