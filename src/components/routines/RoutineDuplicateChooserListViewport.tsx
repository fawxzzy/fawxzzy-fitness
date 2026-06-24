"use client";

import type { ReactNode } from "react";
import { VerticalScrollHint } from "@/components/ui/VerticalScrollHint";
import { cn } from "@/lib/cn";

export const ROUTINE_DUPLICATE_CHOOSER_SCROLL_VIEWPORT_CLASS_NAME = "max-h-[min(17.5rem,34dvh)] pr-1";

export function RoutineDuplicateChooserListViewport({
  children,
  className,
  scrollClassName,
  contentClassName = "space-y-2",
}: {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  contentClassName?: string;
}) {
  return (
    <VerticalScrollHint
      className={cn("min-h-0 pt-3", className)}
      scrollClassName={cn(ROUTINE_DUPLICATE_CHOOSER_SCROLL_VIEWPORT_CLASS_NAME, scrollClassName)}
      contentClassName={contentClassName}
      railSide="right"
    >
      {children}
    </VerticalScrollHint>
  );
}
