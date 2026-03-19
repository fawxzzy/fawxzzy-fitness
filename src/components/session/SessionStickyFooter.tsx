"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";

export const SESSION_STICKY_FOOTER_RESERVE_CLASS = FIXED_CTA_RESERVE_CLASS;

export function SessionStickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 -mx-1 px-1 pb-[calc(var(--app-safe-bottom)+3px)] pt-3",
        "bg-[linear-gradient(180deg,rgba(var(--surface-rgb),0)_0%,rgba(var(--surface-rgb),0.8)_38%,rgba(var(--surface-rgb),0.96)_100%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
