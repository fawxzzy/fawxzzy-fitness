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
  /**
   * Which notices render in flow under the header (content moves down) instead of floating over it. Default
   * "errors": only error notices. "all": every tone, for dense screens where a floating notice covers a card title
   * (the workout screen, 2026-11-23).
   */
  noticesInFlow?: "errors" | "all";
};

export function MobileScreenShell({
  children,
  topChrome,
  headerMenu,
  floatingHeader,
  bottomDock,
  className,
  scrollClassName,
  noticesInFlow,
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
          noticesInFlow={noticesInFlow}
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
  noticesInFlow = "errors",
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

      {/* In-flow notice slot: error notices (every tone with noticesInFlow="all") render here (ToastProvider portals into it), so content moves down. Empty = 0px. */}
      <div ref={noticeFlowSlotRef} data-app-notice-flow-slot="true" data-app-notice-flow-tones={noticesInFlow} className="z-10 flex-none" />

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
          // Opaque on its own: the old gradient used the comma form rgba(<token>, alpha), which is invalid CSS because --bg-app is
          // space-separated ("7 17 27"), so the layer had no background at all and only the backdrop blur hid the cards.
          // WebKit (iOS Safari) skips that blur here, so card text showed through the dock. Space syntax with "/ alpha"
          // is valid; only the top edge fades and the blur is an extra, not the cover.
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,rgb(var(--bg-app)/0.9)_0%,rgb(var(--bg-app))_16%,rgb(var(--bg-app))_100%)] backdrop-blur-[14px]"
        >
          {bottomDock ? bottomDock : <BottomActionsSlot />}
        </div>
      ) : null}
    </section>
  );
}
