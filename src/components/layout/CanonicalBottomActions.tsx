import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
} from "@/components/ui/actionChrome";

export const BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME = "pb-[calc(var(--app-safe-bottom)+2px)]";
export const BOTTOM_ACTION_SURFACE_INNER_CLASSNAME = cn(
  ACTION_CHROME_RAIL_CLASS_NAME,
  "overflow-hidden px-[var(--action-chrome-shell-padding)] py-[var(--action-chrome-shell-padding)]",
);

const CONTROL_LABEL_CLASSNAME = cn(
  "[&_.action-chrome]:leading-[1.08] [&_.action-chrome]:text-center [&_.action-chrome]:whitespace-normal",
  "[&_.action-chrome>span:last-child]:flex [&_.action-chrome>span:last-child]:min-w-0 [&_.action-chrome>span:last-child]:flex-1",
  "[&_.action-chrome>span:last-child]:items-center [&_.action-chrome>span:last-child]:justify-center [&_.action-chrome>span:last-child]:text-center [&_.action-chrome>span:last-child]:self-center",
  "[&_.action-chrome>span:last-child]:leading-[1.08]",
  "[&>a.action-chrome]:leading-[1.08] [&>a.action-chrome]:text-center [&>a.action-chrome]:whitespace-normal",
  "[&>a.action-chrome>span:last-child]:flex [&>a.action-chrome>span:last-child]:min-w-0 [&>a.action-chrome>span:last-child]:flex-1",
  "[&>a.action-chrome>span:last-child]:items-center [&>a.action-chrome>span:last-child]:justify-center [&>a.action-chrome>span:last-child]:text-center [&>a.action-chrome>span:last-child]:self-center",
  "[&>a.action-chrome>span:last-child]:leading-[1.08]",
  "[&>button.action-chrome]:leading-[1.08] [&>button.action-chrome]:text-center [&>button.action-chrome]:whitespace-normal",
  "[&>button.action-chrome>span:last-child]:flex [&>button.action-chrome>span:last-child]:min-w-0 [&>button.action-chrome>span:last-child]:flex-1",
  "[&>button.action-chrome>span:last-child]:items-center [&>button.action-chrome>span:last-child]:justify-center [&>button.action-chrome>span:last-child]:text-center [&>button.action-chrome>span:last-child]:self-center",
  "[&>button.action-chrome>span:last-child]:leading-[1.08]",
  "[&>form]:flex [&>form]:h-full [&>form]:w-full [&>form]:items-stretch",
  "[&>form_.action-chrome]:h-full [&>form_.action-chrome]:w-full",
);

const itemBaseClassName = cn(
  "[&>*]:min-h-[3.2rem] [&>*]:w-full [&>*]:px-4 [&>*]:text-sm [&>*]:font-semibold [&>*]:tracking-[0.01em]",
  CONTROL_LABEL_CLASSNAME,
);

function BottomActionSlot({ children, className, fill = true }: { children: ReactNode; className?: string; fill?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-stretch justify-center self-stretch",
        fill ? "flex-1 basis-0 [&>*]:w-full" : "shrink-0 [&>*]:w-auto",
        "[&>*]:min-h-[3.2rem] [&>form>*]:h-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SegmentedRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(ACTION_CHROME_RAIL_GRID_CLASS_NAME, itemBaseClassName, className)}>{children}</div>;
}

const dominantPrimaryClassName = cn(
  "[&_.action-chrome]:min-h-[3.3rem] [&_.action-chrome]:rounded-[var(--action-chrome-segment-radius)]",
  "[&>a.action-chrome]:min-h-[3.3rem] [&>a.action-chrome]:rounded-[var(--action-chrome-segment-radius)]",
  "[&>button.action-chrome]:min-h-[3.3rem] [&>button.action-chrome]:rounded-[var(--action-chrome-segment-radius)]",
  "[&>form_.action-chrome]:min-h-[3.3rem] [&>form_.action-chrome]:rounded-[var(--action-chrome-segment-radius)]",
);

export function BottomActionSingle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "grid-cols-1", itemBaseClassName, dominantPrimaryClassName, className)}>{children}</div>;
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, className)}>
      <SegmentedRow className="grid-cols-2 [&>*]:h-full [&>*]:min-w-0 [&>*]:basis-0">
        <BottomActionSlot>{secondary}</BottomActionSlot>
        <BottomActionSlot>{primary}</BottomActionSlot>
      </SegmentedRow>
    </div>
  );
}

export function BottomActionTriad({
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
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, className)}>
      <SegmentedRow className="grid-cols-[minmax(0,1fr)_minmax(5.75rem,7.25rem)_minmax(0,1fr)]">
        <BottomActionSlot className={secondaryClassName}>{secondary}</BottomActionSlot>
        <BottomActionSlot
          className={cn(
            "px-1 justify-self-stretch [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[6.5rem]",
            CONTROL_LABEL_CLASSNAME,
            tertiaryClassName,
          )}
          fill={tertiaryFill}
        >
          {tertiary}
        </BottomActionSlot>
        <BottomActionSlot className={primaryClassName}>{primary}</BottomActionSlot>
      </SegmentedRow>
    </div>
  );
}

function BottomActionUtilityRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        ACTION_CHROME_RAIL_GRID_CLASS_NAME,
        "flex flex-wrap items-stretch [&>*]:min-h-11 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-0",
        itemBaseClassName,
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

export function BottomActionStackedPrimary({ utility, primary, className }: { utility?: ReactNode; primary: ReactNode; className?: string }) {
  return (
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "grid-cols-1", itemBaseClassName, className)}>
      {utility ? <BottomActionUtilityRow>{utility}</BottomActionUtilityRow> : null}
      <div className={cn(ACTION_CHROME_RAIL_GRID_CLASS_NAME, "grid-cols-1", dominantPrimaryClassName)}>{primary}</div>
    </div>
  );
}

export const BottomActionTriple = BottomActionTriad;
export const BottomActionStack = BottomActionStackedPrimary;
