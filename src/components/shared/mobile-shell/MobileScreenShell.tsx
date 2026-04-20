"use client";

import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BottomActionsProvider, BottomActionsSlot, usePublishedBottomActions } from "@/components/layout/bottom-actions";
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
  return (
    <BottomActionsProvider>
      <MobileScreenShellFrame
        topChrome={topChrome}
        floatingHeader={floatingHeader}
        bottomDock={bottomDock}
        className={className}
        scrollClassName={scrollClassName}
      >
        {children}
      </MobileScreenShellFrame>
    </BottomActionsProvider>
  );
}

function MobileScreenShellFrame({
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
  const publishedBottomActions = usePublishedBottomActions();
  const dockRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const hasTopChrome = Boolean(topChrome);
  const hasFloatingHeader = Boolean(floatingHeader);
  const hasPublishedBottomActions = Boolean(publishedBottomActions?.node);
  const shouldRenderBottomDock = Boolean(bottomDock) || hasPublishedBottomActions;
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

  useLayoutEffect(() => {
    if (!shouldRenderBottomDock) {
      setDockHeight(0);
      return;
    }

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
  }, [bottomDock, shouldRenderBottomDock]);

  return (
    <section className={cn("relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden", className)}>
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
        style={{
          "--bottom-actions-height": `${dockHeight}px`,
          "--app-mobile-bottom-dock-height": `${dockHeight}px`,
          scrollPaddingBottom: shouldRenderBottomDock ? "var(--app-dock-safe-padding-bottom,0px)" : undefined,
        } as CSSProperties}
      >
        <div
          ref={scrollContentRef}
          className={cn(
            "min-w-0 max-w-full overflow-x-hidden",
            shouldApplyTopChromeContentGap ? "pt-[var(--app-top-chrome-content-gap,8px)]" : "",
          )}
        >
          {children}
        </div>
      </ScrollContainer>

      {shouldRenderBottomDock ? (
        <div
          ref={dockRef}
          className="z-40 flex-none border-t border-white/6 bg-[linear-gradient(180deg,rgba(var(--bg-app),0.86)_0%,rgba(var(--bg-app),0.96)_16%,rgba(var(--bg-app),0.995)_100%)] shadow-[0_-6px_16px_rgba(0,0,0,0.16)] backdrop-blur-[10px]"
        >
          {bottomDock ? bottomDock : <BottomActionsSlot />}
        </div>
      ) : null}
    </section>
  );
}
