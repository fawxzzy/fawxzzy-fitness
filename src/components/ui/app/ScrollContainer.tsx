import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ScrollContainerProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollContainer({ children, className }: ScrollContainerProps) {
  return <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain", className)}>{children}</div>;
}

