"use client";

import type { ReactNode } from "react";
import { BottomActionsProvider, BottomActionsSlot, useHasBottomActions } from "@/components/layout/bottom-actions";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { cn } from "@/lib/cn";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
};

function ScrollScreenWithBottomActionsContent({ children, className }: ScrollScreenWithBottomActionsProps) {
  const hasBottomActions = useHasBottomActions();

  return (
    <ScrollContainer className={cn(className, hasBottomActions ? FIXED_CTA_RESERVE_CLASS : undefined)}>
      {children}
      <BottomActionsSlot />
    </ScrollContainer>
  );
}

export function ScrollScreenWithBottomActions({ children, className }: ScrollScreenWithBottomActionsProps) {
  return (
    <BottomActionsProvider>
      <ScrollScreenWithBottomActionsContent className={className}>{children}</ScrollScreenWithBottomActionsContent>
    </BottomActionsProvider>
  );
}
