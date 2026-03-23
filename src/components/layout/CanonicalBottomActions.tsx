import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME = "px-3.5 pb-[calc(var(--app-safe-bottom)+0.3rem)]";
export const BOTTOM_ACTION_SURFACE_INNER_CLASSNAME = cn(
  "rounded-[1.5rem] border border-white/12 bg-[rgb(var(--surface-rgb)/0.965)]",
  "px-2.5 py-2.5 shadow-[0_8px_22px_rgba(0,0,0,0.2)] backdrop-blur-md",
);

const itemBaseClassName = "[&>*]:min-h-12 [&>*]:w-full [&>*]:rounded-[1rem] [&>*]:px-4 [&>*]:text-sm [&>*]:font-semibold [&>*]:tracking-[0.01em] [&>form]:flex [&>form]:h-full [&>form]:w-full [&>form]:items-stretch";
const segmentedSurfaceClassName = cn(
  "overflow-hidden rounded-[1.1rem] border border-white/8 bg-white/[0.03]",
  "[&>*+*]:border-l [&>*+*]:border-white/10",
);
const segmentedItemClassName = cn(
  "[&_.app-button]:rounded-none [&_.app-button]:border-transparent [&_.app-button]:bg-transparent [&_.app-button]:shadow-none",
  "[&_.app-button]:text-[rgb(var(--text)/0.86)] [&_.app-button:hover]:bg-white/[0.03] [&_.app-button:active]:bg-white/[0.06]",
  "[&_.app-button]:focus-visible:ring-[var(--button-focus-ring)] [&_.app-button]:focus-visible:ring-inset",
  "[&>a]:rounded-none [&>a]:border-transparent [&>a]:bg-transparent [&>a]:shadow-none",
  "[&>a]:text-[rgb(var(--text)/0.86)] [&>a:hover]:bg-white/[0.03] [&>a:active]:bg-white/[0.06]",
  "[&>form_.app-button]:w-full",
);
const segmentedUtilityRowClassName = cn(
  segmentedSurfaceClassName,
  "[&>*]:min-h-11 [&>*]:min-w-0 [&>*]:flex-1",
  "[&>*]:px-0",
);

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
        "grid grid-cols-2 items-stretch [&>*]:h-full",
        segmentedSurfaceClassName,
        itemBaseClassName,
        className,
      )}
    >
      <BottomActionSlot className={segmentedItemClassName}>{secondary}</BottomActionSlot>
      <BottomActionSlot className={segmentedItemClassName}>{primary}</BottomActionSlot>
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
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch",
        segmentedSurfaceClassName,
        itemBaseClassName,
        className,
      )}
    >
      <BottomActionSlot className={cn(segmentedItemClassName, secondaryClassName)}>{secondary}</BottomActionSlot>
      <BottomActionSlot className={cn(segmentedItemClassName, tertiaryClassName)} fill={tertiaryFill}>{tertiary}</BottomActionSlot>
      <BottomActionSlot className={cn(segmentedItemClassName, primaryClassName)}>{primary}</BottomActionSlot>
    </div>
  );
}

function BottomActionUtilityRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch",
        segmentedUtilityRowClassName,
        segmentedItemClassName,
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
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, "grid grid-cols-1 gap-2.5", itemBaseClassName, className)}>
      {utility ? <BottomActionUtilityRow>{utility}</BottomActionUtilityRow> : null}
      <div className="grid grid-cols-1 gap-2">{primary}</div>
    </div>
  );
}
