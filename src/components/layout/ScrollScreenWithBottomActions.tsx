"use client";

import type { ReactNode } from "react";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
  topChrome?: ReactNode;
};

export function ScrollScreenWithBottomActions({ children, className, topChrome }: ScrollScreenWithBottomActionsProps) {
  return (
    <MobileScreenScaffold scrollClassName={className} topChrome={topChrome}>
      {children}
    </MobileScreenScaffold>
  );
}
