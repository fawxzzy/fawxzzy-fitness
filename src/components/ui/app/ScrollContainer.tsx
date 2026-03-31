import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ScrollContainerProps = {
  children: ReactNode;
  className?: string;
  style?: import("react").CSSProperties;
};

export function ScrollContainer({ children, className, style }: ScrollContainerProps) {
  return <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain", className)} style={style}>{children}</div>;
}

