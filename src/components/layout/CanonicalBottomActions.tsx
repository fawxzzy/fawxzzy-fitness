import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const frameClassName = cn(
  "rounded-[1.5rem] border border-white/12 bg-[rgb(var(--surface-rgb)/0.965)]",
  "px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-md",
);

const itemBaseClassName = "[&>*]:min-h-12 [&>*]:w-full";

export function BottomActionSingle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(frameClassName, "grid grid-cols-1 gap-2", itemBaseClassName, className)}>{children}</div>;
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        frameClassName,
        "grid grid-cols-2 gap-2",
        itemBaseClassName,
        "[&>*:first-child]:order-2 [&>*:last-child]:order-1",
        "sm:[&>*:first-child]:order-1 sm:[&>*:last-child]:order-2",
        className,
      )}
    >
      {primary}
      {secondary}
    </div>
  );
}

export function BottomActionUtilityCluster({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        frameClassName,
        "flex flex-wrap items-stretch gap-2 [&>*]:min-h-11 [&>*]:min-w-[8rem] [&>*]:flex-1",
        className,
      )}
    >
      {children}
    </div>
  );
}
