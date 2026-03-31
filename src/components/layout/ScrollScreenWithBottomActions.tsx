"use client";

import type { ReactNode } from "react";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
  topChrome?: ReactNode;
  bottomDock?: ReactNode;
};

export function ScrollScreenWithBottomActions({ children, className, topChrome, bottomDock }: ScrollScreenWithBottomActionsProps) {
  return (
    <MobileScreenScaffold scrollClassName={className} topChrome={topChrome} bottomDock={bottomDock}>
      {children}
    </MobileScreenScaffold>
  );
}
