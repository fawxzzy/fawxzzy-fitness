import { cn } from "@/lib/cn";

export const swipeRailShellClassName = "grid h-full w-full items-stretch overflow-hidden rounded-[inherit] border border-border/28 bg-[linear-gradient(180deg,rgba(var(--surface-2-soft),0.96),rgba(var(--surface-2-soft),0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(var(--bg),0.08)]";

export function getSwipeRailShellClassName({
  columnCount,
  isVisible,
}: {
  columnCount: 1 | 2;
  isVisible: boolean;
}) {
  return cn(
    swipeRailShellClassName,
    columnCount === 2 ? "grid-cols-2 divide-x divide-border/30" : "grid-cols-1",
    "transition-opacity duration-200",
    isVisible ? "opacity-100" : "opacity-0 group-focus-within/swipe-row:opacity-100 group-hover/swipe-row:opacity-100",
  );
}

export const swipeRailSlotBaseClassName = "!h-full min-h-0 w-full items-center justify-center rounded-none border-0 bg-transparent px-0";
