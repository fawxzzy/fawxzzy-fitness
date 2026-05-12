import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ScrollContainerProps = {
  children: ReactNode;
  className?: string;
  style?: import("react").CSSProperties;
};

export function ScrollContainer({ children, className, style }: ScrollContainerProps) {
  return (
    <div
      data-app-scroll-container="true"
      className={cn(
        "hide-scrollbar flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:none]",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
