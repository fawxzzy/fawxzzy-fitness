"use client";

import type { ReactNode } from "react";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";
import { StandaloneScreenSafeArea } from "@/components/ui/app/StandaloneScreenSafeArea";
import { cn } from "@/lib/cn";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
  topChrome?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
};

export function ScrollScreenWithBottomActions({ children, className, topChrome, floatingHeader, bottomDock }: ScrollScreenWithBottomActionsProps) {
  const wrappedChildren = topChrome || floatingHeader
    ? children
    : <StandaloneScreenSafeArea>{children}</StandaloneScreenSafeArea>;

  return (
    <MobileScreenScaffold
      scrollClassName={cn("min-w-0 max-w-full overflow-x-hidden touch-pan-y", className)}
      topChrome={topChrome}
      floatingHeader={floatingHeader}
      bottomDock={bottomDock}
    >
      {wrappedChildren}
    </MobileScreenScaffold>
  );
}
