"use client";

import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BottomActionsProvider, BottomActionsSlot, usePublishedBottomActions } from "@/components/layout/bottom-actions";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { cn } from "@/lib/cn";
import { useAppNoticeAnchor } from "@/components/shared/mobile-shell/useAppNoticeAnchor";

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
  // A `ScreenHeader` rendered inside scroll content scrolls away with it and emits a dev warning.
  const publishedBottomActions = usePublishedBottomActions();
  const dockRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const topChromeRef = useRef<HTMLDivElement | null>(null);
  const floatingHeaderRef = useRef<HTMLDivElement | null>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const hasTopChrome = Boolean(topChrome);
  const hasFloatingHeader = Boolean(floatingHeader);
  const hasPublishedBottomActions = Boolean(publishedBottomActions?.node);
  const shouldRenderBottomDock = Boolean(bottomDock) || hasPublishedBottomActions;
  const shouldApplyTopChromeFloatingHeaderGap = hasTopChrome && hasFloatingHeader;
  const shouldApplyTopChromeContentGap = hasTopChrome && !hasFloatingHeader;
  const scrollBottomReserve = shouldRenderBottomDock
    ? "calc(var(--app-mobile-bottom-dock-height) + 14px)"
    : undefined;

  useAppNoticeAnchor({ shellRef, topChromeRef, floatingHeaderRef, layoutKey: `${hasTopChrome}-${hasFloatingHeader}` });

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEBUG_MOBILE_SHELL !== "1") return;
    const hasScrollingScreenHeader = Boolean(scrollContentRef.current?.querySelector("[data-screen-header]"));
    if (!hasScrollingScreenHeader) return;

    console.warn(
      "[MobileScreenShell] Detected a ScreenHeader inside scroll content. Route headers must use the floatingHeader slot so they stay on screen.",
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
    <section
      ref={shellRef}
      data-mobile-screen-shell="true"
      className={cn("relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden", className)}
      style={{
        "--bottom-actions-height": `${dockHeight}px`,
        "--app-mobile-bottom-dock-height": `${dockHeight}px`,
      } as CSSProperties}
    >
      {hasTopChrome ? <div ref={topChromeRef} className="z-30 flex-none pt-[var(--app-top-nav-safe-top,var(--app-safe-top))]">{topChrome}</div> : null}
      {hasFloatingHeader ? (
        <div
          ref={floatingHeaderRef}
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
          paddingBottom: scrollBottomReserve,
          scrollPaddingBottom: scrollBottomReserve,
        } as CSSProperties}
      >
          <div
            ref={scrollContentRef}
            className={cn(
              "min-w-0 max-w-full overflow-x-clip",
              shouldApplyTopChromeContentGap ? "pt-[var(--app-top-chrome-content-gap,8px)]" : "",
            )}
          >
          {children}
        </div>
      </ScrollContainer>

      {shouldRenderBottomDock ? (
        <div
          ref={dockRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,rgba(var(--bg-app),0.72)_0%,rgba(var(--bg-app),0.9)_14%,rgba(var(--bg-app),0.985)_100%)] backdrop-blur-[14px]"
        >
          {bottomDock ? bottomDock : <BottomActionsSlot />}
        </div>
      ) : null}
    </section>
  );
}
