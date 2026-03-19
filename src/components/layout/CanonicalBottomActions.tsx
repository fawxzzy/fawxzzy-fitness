import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const frameClassName = cn(
  "rounded-[1.5rem] border border-white/12 bg-[rgb(var(--surface-rgb)/0.965)]",
  "px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-md",
);

const itemBaseClassName = "[&>*]:min-h-12 [&>*]:w-full";

function BottomActionSlot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-1 basis-0 items-stretch justify-center [&>*]:w-full", className)}>
      {children}
    </div>
  );
}

export function BottomActionSingle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(frameClassName, "grid grid-cols-1 gap-2", itemBaseClassName, className)}>{children}</div>;
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        frameClassName,
        "flex items-stretch gap-2",
        className,
      )}
    >
      <BottomActionSlot className="order-2 sm:order-1">{primary}</BottomActionSlot>
      <BottomActionSlot className="order-1 sm:order-2">{secondary}</BottomActionSlot>
    </div>
  );
}

export function BottomActionTriple({
  primary,
  secondary,
  tertiary,
  className,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  tertiary: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        frameClassName,
        "grid grid-cols-1 gap-2 sm:grid-cols-3",
        itemBaseClassName,
        className,
      )}
    >
      <BottomActionSlot>{secondary}</BottomActionSlot>
      <BottomActionSlot>{tertiary}</BottomActionSlot>
      <BottomActionSlot>{primary}</BottomActionSlot>
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
