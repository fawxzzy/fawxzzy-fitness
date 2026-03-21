import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME = "px-4 pb-[calc(var(--app-safe-bottom)+0.4rem)]";
export const BOTTOM_ACTION_SURFACE_INNER_CLASSNAME = cn(
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
  return <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, "grid grid-cols-1 gap-2", itemBaseClassName, className)}>{children}</div>;
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        BOTTOM_ACTION_SURFACE_INNER_CLASSNAME,
        "flex items-stretch gap-2",
        className,
      )}
    >
      <BottomActionSlot>{secondary}</BottomActionSlot>
      <BottomActionSlot>{primary}</BottomActionSlot>
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
        BOTTOM_ACTION_SURFACE_INNER_CLASSNAME,
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

function BottomActionUtilityRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 [&>*]:min-h-11 [&>*]:min-w-[8rem] [&>*]:flex-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BottomActionUtilityCluster({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, className)}><BottomActionUtilityRow>{children}</BottomActionUtilityRow></div>;
}

export function BottomActionStack({ utility, primary, className }: { utility?: ReactNode; primary: ReactNode; className?: string }) {
  return (
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, "grid grid-cols-1 gap-2", itemBaseClassName, className)}>
      {utility ? <BottomActionUtilityRow>{utility}</BottomActionUtilityRow> : null}
      <div className="grid grid-cols-1 gap-2">{primary}</div>
    </div>
  );
}
