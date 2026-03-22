import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME = "px-4 pb-[calc(var(--app-safe-bottom)+0.4rem)]";
export const BOTTOM_ACTION_SURFACE_INNER_CLASSNAME = cn(
  "rounded-[1.5rem] border border-white/12 bg-[rgb(var(--surface-rgb)/0.965)]",
  "px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-md",
);

const itemBaseClassName = "[&>*]:min-h-12 [&>*]:w-full [&>*]:rounded-[1rem] [&>*]:px-4 [&>*]:text-sm [&>*]:font-semibold [&>*]:tracking-[0.01em] [&>form]:flex [&>form]:h-full [&>form]:w-full [&>form]:items-stretch";

function BottomActionSlot({ children, className, fill = true }: { children: ReactNode; className?: string; fill?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-stretch justify-center self-stretch",
        fill ? "flex-1 basis-0 [&>*]:w-full" : "shrink-0 [&>*]:w-auto",
        "[&>*]:min-h-12 [&>form>*]:h-full",
        className,
      )}
    >
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
        "grid grid-cols-2 items-stretch gap-2 [&>*]:h-full",
        itemBaseClassName,
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
  primaryClassName,
  secondaryClassName,
  tertiaryClassName,
  tertiaryFill = false,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  tertiary: ReactNode;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  tertiaryClassName?: string;
  tertiaryFill?: boolean;
}) {
  return (
    <div
      className={cn(
        BOTTOM_ACTION_SURFACE_INNER_CLASSNAME,
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2",
        itemBaseClassName,
        className,
      )}
    >
      <BottomActionSlot className={secondaryClassName}>{secondary}</BottomActionSlot>
      <BottomActionSlot className={tertiaryClassName} fill={tertiaryFill}>{tertiary}</BottomActionSlot>
      <BottomActionSlot className={primaryClassName}>{primary}</BottomActionSlot>
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
