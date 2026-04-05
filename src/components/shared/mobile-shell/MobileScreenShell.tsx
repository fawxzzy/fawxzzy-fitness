"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { BottomActionsProvider, BottomActionsSlot } from "@/components/layout/bottom-actions";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { cn } from "@/lib/cn";

type MobileScreenShellProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function MobileScreenShell({
  children,
  topChrome,
  floatingHeader,
  bottomDock,
  className,
  scrollClassName,
}: MobileScreenShellProps) {
  // Mobile shell contract:
  // All route headers must render via `floatingHeader`.
  // Rendering `SharedScreenHeader` inside scroll content is deprecated and emits a dev warning.
  const dockRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const hasTopChrome = Boolean(topChrome);
  const hasFloatingHeader = Boolean(floatingHeader);
  const shouldApplyTopChromeFloatingHeaderGap = hasTopChrome && hasFloatingHeader;
  const shouldApplyTopChromeContentGap = hasTopChrome && !hasFloatingHeader;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hasDeprecatedScrollHeader = Boolean(scrollContentRef.current?.querySelector("[data-shared-screen-header='true']"));
    if (!hasDeprecatedScrollHeader) return;

    console.warn(
      "[MobileScreenShell] Detected SharedScreenHeader inside scroll content. Route headers must use the floatingHeader slot; scroll headers are deprecated.",
    );
  }, [children]);

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
        {hasTopChrome ? <div className="z-30 flex-none pt-[var(--app-top-nav-safe-top,var(--app-safe-top))]">{topChrome}</div> : null}
        {hasFloatingHeader ? (
          <div
            className={cn(
              "z-20 flex-none",
              shouldApplyTopChromeFloatingHeaderGap ? "pt-[var(--app-top-chrome-floating-header-gap,8px)]" : "",
              hasTopChrome ? "" : "pt-[var(--app-standalone-safe-top,max(var(--app-safe-top),var(--vv-top,0px)))]",
            )}
          >
            {floatingHeader}
          </div>
        ) : null}

        <ScrollContainer
          className={cn("min-h-0 flex-1", scrollClassName)}
          style={{ "--app-mobile-bottom-dock-height": `${dockHeight}px` } as CSSProperties}
        >
          <div
            ref={scrollContentRef}
            className={cn(
              "min-w-0 max-w-full overflow-x-hidden pb-[calc(var(--app-mobile-bottom-dock-height,0px)+var(--app-mobile-dock-clearance-gap,0px))]",
              shouldApplyTopChromeContentGap ? "pt-[var(--app-top-chrome-content-gap,8px)]" : "",
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
