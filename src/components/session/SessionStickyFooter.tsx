"use client";

import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";

export const SESSION_STICKY_FOOTER_RESERVE_CLASS = FIXED_CTA_RESERVE_CLASS;

export function SessionStickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(appTokens.exerciseLogStickyShell, className)}>
      {children}
    </div>
  );
}
