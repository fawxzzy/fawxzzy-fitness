"use client";

import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BottomActionsProvider, BottomActionsSlot, usePublishedBottomActions } from "@/components/layout/bottom-actions";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { ScreenHeaderMenuProvider, ScreenHeaderMenuSlot } from "@/components/ui/app/ScreenHeaderMenu";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";
import { cn } from "@/lib/cn";
import { useNoticeFlowSlotRef } from "@/components/ui/ToastProvider";
import { useAppNoticeAnchor } from "@/components/shared/mobile-shell/useAppNoticeAnchor";

type MobileScreenShellProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  /** The app menu: every ScreenHeader in this shell shows it top right on the title line. */
  headerMenu?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function MobileScreenShell({
  children,
  topChrome,
  headerMenu,
  floatingHeader,
  bottomDock,
  className,
  scrollClassName,
}: MobileScreenShellProps) {
  return (
    <BottomActionsProvider>
      <ScreenHeaderMenuProvider menu={headerMenu}>
        <MobileScreenShellFrame
          topChrome={topChrome}
          headerMenu={headerMenu}
          floatingHeader={floatingHeader}
          bottomDock={bottomDock}
          className={className}
          scrollClassName={scrollClassName}
        >
          {children}
        </MobileScreenShellFrame>
      </ScreenHeaderMenuProvider>
    </BottomActionsProvider>
  );
}

function MobileScreenShellFrame({
  children,
  topChrome,
  headerMenu,
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
  // The header layer: the notice anchor fallback when no menu button is on screen.
  const floatingHeaderRef = useRef<HTMLDivElement | null>(null);
  const noticeFlowSlotRef = useNoticeFlowSlotRef();
  const [dockHeight, setDockHeight] = useState(0);
  const hasTopChrome = Boolean(topChrome);
  // A screen with the app menu but no header of its own still gets the menu, alone on the top line.
  const hasHeaderMenuOnly = Boolean(headerMenu) && !floatingHeader;
  const hasFloatingHeader = Boolean(floatingHeader) || hasHeaderMenuOnly;
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
          data-app-header="true"
          className={cn(
            "z-20 flex-none",
            shouldApplyTopChromeFloatingHeaderGap ? "pt-[var(--app-top-chrome-floating-header-gap,8px)]" : "",
            hasTopChrome ? "" : "pt-[var(--app-standalone-safe-top,max(var(--app-safe-top),var(--vv-top,0px)))]",
          )}
        >
          {hasHeaderMenuOnly ? (
            <div className={screenHeaderTokens.root}>
              <div className={cn(screenHeaderTokens.row, "justify-end")}>
                <ScreenHeaderMenuSlot />
              </div>
            </div>
          ) : floatingHeader}
        </div>
      ) : null}

      {/* In-flow notice slot: error notices render here (ToastProvider portals into it), so content moves down. Empty = 0px. */}
      <div ref={noticeFlowSlotRef} data-app-notice-flow-slot="true" className="z-10 flex-none" />

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
          data-app-bottom-dock=""
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,rgba(var(--bg-app),0.86)_0%,rgba(var(--bg-app),0.96)_14%,rgba(var(--bg-app),0.985)_100%)] backdrop-blur-[14px]"
        >
          {bottomDock ? bottomDock : <BottomActionsSlot />}
        </div>
      ) : null}
    </section>
  );
}
