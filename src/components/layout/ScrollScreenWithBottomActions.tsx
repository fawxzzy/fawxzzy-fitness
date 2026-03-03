"use client";

import type { ReactNode } from "react";
import { BottomActionsProvider, BottomActionsSlot } from "@/components/layout/bottom-actions";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollScreenWithBottomActions({ children, className }: ScrollScreenWithBottomActionsProps) {
  return (
    <BottomActionsProvider>
      <ScrollContainer className={className}>
        {children}
        <BottomActionsSlot />
      </ScrollContainer>
    </BottomActionsProvider>
  );
}
