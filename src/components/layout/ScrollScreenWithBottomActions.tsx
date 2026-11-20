"use client";

import type { ReactNode } from "react";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";
import { StandaloneScreenSafeArea } from "@/components/ui/app/StandaloneScreenSafeArea";
import { cn } from "@/lib/cn";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
  topChrome?: ReactNode;
  /** The app menu (`<AppMenu />`): shown top right on the screen title line. */
  headerMenu?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
};

export function ScrollScreenWithBottomActions({ children, className, topChrome, headerMenu, floatingHeader, bottomDock }: ScrollScreenWithBottomActionsProps) {
  const wrappedChildren = topChrome || floatingHeader || headerMenu
    ? children
    : <StandaloneScreenSafeArea>{children}</StandaloneScreenSafeArea>;

  return (
    <MobileScreenScaffold
      scrollClassName={cn("min-w-0 max-w-full overflow-x-hidden [touch-action:pan-x_pan-y]", className)}
      topChrome={topChrome}
      headerMenu={headerMenu}
      floatingHeader={floatingHeader}
      bottomDock={bottomDock}
    >
      {wrappedChildren}
    </MobileScreenScaffold>
  );
}
