import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_CONTENT_PADDING_CLASS = "pb-[calc(env(safe-area-inset-bottom)+112px)]";

export function BottomActionBar({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-40", className)}>
      <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
        <div
          className={cn(
            "flex items-center justify-center gap-3 rounded-2xl border border-[rgb(var(--glass-tint-rgb)/0.34)] bg-[rgb(var(--glass-tint-rgb)/0.72)] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_10px_24px_rgb(0_0_0/0.32)] backdrop-blur-md",
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
