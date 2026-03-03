"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function BottomActionBar({
  children,
  className,
  innerClassName,
  variant = "sticky",
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
