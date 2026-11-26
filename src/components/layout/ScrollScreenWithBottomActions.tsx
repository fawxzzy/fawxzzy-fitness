"use client";

import type { ReactNode } from "react";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";
import { StandaloneScreenSafeArea } from "@/components/ui/app/StandaloneScreenSafeArea";
import type { NoticePlacement } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
  topChrome?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
  /**
   * Which notices render in flow under the header (content moves down) instead of floating over it. Default
   * "errors": only error notices. "all": every tone, for dense screens where a floating notice covers a card title
   * (the workout screen, 2026-11-23).
   */
  noticesInFlow?: "errors" | "all";
  /**
   * Where the notice slot sits. Default "under-header" (in flow, see noticesInFlow). "above-dock": an overlay pinned
   * just above the bottom dock that takes every tone, one notice at a time, and never moves a card (the workout
   * screen, 2026-11-24).
   */
  noticePlacement?: NoticePlacement;
};

export function ScrollScreenWithBottomActions({ children, className, topChrome, floatingHeader, bottomDock, noticesInFlow, noticePlacement }: ScrollScreenWithBottomActionsProps) {
  const wrappedChildren = topChrome || floatingHeader
    ? children
    : <StandaloneScreenSafeArea>{children}</StandaloneScreenSafeArea>;

  return (
    <MobileScreenScaffold
      scrollClassName={cn("min-w-0 max-w-full overflow-x-hidden [touch-action:pan-x_pan-y]", className)}
      topChrome={topChrome}
      floatingHeader={floatingHeader}
      bottomDock={bottomDock}
      noticesInFlow={noticesInFlow}
      noticePlacement={noticePlacement}
    >
      {wrappedChildren}
    </MobileScreenScaffold>
  );
}
