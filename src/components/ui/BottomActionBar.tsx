"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_HEIGHT_PX = 120;
export const FIXED_CTA_RESERVE_CLASS = `pb-[calc(${BOTTOM_ACTION_BAR_HEIGHT_PX}px+env(safe-area-inset-bottom,0px)+3px)]`;
export const BOTTOM_ACTION_BAR_CONTENT_RESERVE_CLASS = FIXED_CTA_RESERVE_CLASS;

export function BottomActionBar({
  children,
  className,
  innerClassName,
  variant = "fixed",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  variant?: "sticky" | "fixed";
}) {
  const isFixed = variant === "fixed";

  return (
    <div
      className={cn(
        "app-bottom-action-bar",
        isFixed ? "pointer-events-none fixed inset-x-0 bottom-0 z-50" : "sticky bottom-0 z-50 pt-[3px]",
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-md px-3", isFixed ? "pointer-events-auto" : undefined)}>
        <div
          className={cn(
            "flex items-center justify-center gap-3 rounded-2xl border border-[rgb(var(--glass-tint-rgb)/0.34)] bg-[rgb(var(--glass-tint-rgb)/0.72)] px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+3px)] shadow-[0_10px_24px_rgb(0_0_0/0.32)] backdrop-blur-md",
            "[&>*]:min-h-[44px] [&>*]:flex-1",
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
