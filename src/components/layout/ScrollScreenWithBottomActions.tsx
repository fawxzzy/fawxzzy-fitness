"use client";

import type { ReactNode } from "react";
import { BottomActionsProvider, BottomActionsSlot } from "@/components/layout/bottom-actions";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { cn } from "@/lib/cn";

type ScrollScreenWithBottomActionsProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollScreenWithBottomActions({ children, className }: ScrollScreenWithBottomActionsProps) {
  return (
    <BottomActionsProvider>
      <ScrollContainer className={cn(className, FIXED_CTA_RESERVE_CLASS)}>
        {children}
        <BottomActionsSlot />
      </ScrollContainer>
    </BottomActionsProvider>
  );
}
