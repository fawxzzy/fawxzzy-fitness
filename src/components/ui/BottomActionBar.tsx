import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_HEIGHT_PX = 88;
export const BOTTOM_ACTION_BAR_CONTENT_PADDING_CLASS = "pb-[var(--app-bottom-offset)]";

export function BottomActionBar({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const barStyle = {
    "--app-bottom-bar-height": `${BOTTOM_ACTION_BAR_HEIGHT_PX}px`,
  } as CSSProperties;

  return (
    <div className={cn("app-bottom-action-bar pointer-events-none fixed inset-x-0 bottom-0 z-50", className)} style={barStyle}>
      <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
        <div
          className={cn(
            "flex items-center justify-center gap-3 rounded-2xl border border-[rgb(var(--glass-tint-rgb)/0.34)] bg-[rgb(var(--glass-tint-rgb)/0.72)] px-3 pt-3 pb-[calc(var(--app-bottom-inset)+var(--app-bottom-gutter))] shadow-[0_10px_24px_rgb(0_0_0/0.32)] backdrop-blur-md",
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
