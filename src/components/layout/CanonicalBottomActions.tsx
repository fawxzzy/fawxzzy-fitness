import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const frameClassName =
  "rounded-[1.5rem] border border-white/12 bg-[rgb(var(--surface-rgb)/0.965)] px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-md";

export function BottomActionSingle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(frameClassName, "grid grid-cols-1 gap-2 [&>*]:min-h-12 [&>*]:w-full", className)}>{children}</div>;
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        frameClassName,
        "grid grid-cols-1 gap-2 [&>*]:min-h-12 [&>*]:w-full sm:grid-cols-[minmax(0,1fr)_auto] sm:[&>*:last-child]:w-auto sm:[&>*:last-child]:min-w-[8.5rem]",
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
