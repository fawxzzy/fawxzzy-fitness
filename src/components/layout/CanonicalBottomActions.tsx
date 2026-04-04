import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME = "px-3 pb-[calc(var(--app-safe-bottom)+1px)]";
export const BOTTOM_ACTION_SURFACE_INNER_CLASSNAME = cn(
  "rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(var(--surface-rgb),0.985),rgba(var(--surface-rgb),0.955))]",
  "px-2 py-1.25 shadow-[0_6px_16px_rgba(0,0,0,0.14)] backdrop-blur-md",
);

const CONTROL_LABEL_CLASSNAME = cn(
  "[&_.app-button]:leading-[1.08] [&_.app-button]:text-center [&_.app-button]:whitespace-normal",
  "[&_.app-button>span:last-child]:flex [&_.app-button>span:last-child]:min-w-0 [&_.app-button>span:last-child]:flex-1",
  "[&_.app-button>span:last-child]:items-center [&_.app-button>span:last-child]:justify-center [&_.app-button>span:last-child]:text-center [&_.app-button>span:last-child]:self-center",
  "[&_.app-button>span:last-child]:leading-[1.08]",
  "[&>a]:leading-[1.08] [&>a]:text-center [&>a]:whitespace-normal",
  "[&>a>span:last-child]:flex [&>a>span:last-child]:min-w-0 [&>a>span:last-child]:flex-1",
  "[&>a>span:last-child]:items-center [&>a>span:last-child]:justify-center [&>a>span:last-child]:text-center [&>a>span:last-child]:self-center",
  "[&>a>span:last-child]:leading-[1.08]",
  "[&>button]:leading-[1.08] [&>button]:text-center [&>button]:whitespace-normal",
  "[&>button>span:last-child]:flex [&>button>span:last-child]:min-w-0 [&>button>span:last-child]:flex-1",
  "[&>button>span:last-child]:items-center [&>button>span:last-child]:justify-center [&>button>span:last-child]:text-center [&>button>span:last-child]:self-center",
  "[&>button>span:last-child]:leading-[1.08]",
  "[&>form]:flex [&>form]:h-full [&>form]:w-full [&>form]:items-stretch",
  "[&>form_.app-button]:h-full [&>form_.app-button]:w-full",
);

const itemBaseClassName = cn(
  "[&>*]:min-h-12 [&>*]:w-full [&>*]:px-4 [&>*]:text-sm [&>*]:font-semibold [&>*]:tracking-[0.01em]",
  CONTROL_LABEL_CLASSNAME,
);

const segmentedSurfaceClassName = cn(
  "overflow-hidden rounded-[1.12rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.018),inset_0_-1px_0_rgba(0,0,0,0.08)]",
  "[&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:inset-y-[9px] [&>*+*]:before:left-0 [&>*+*]:before:w-px [&>*+*]:before:-translate-x-1/2 [&>*+*]:before:bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.09),rgba(255,255,255,0))] [&>*+*]:after:absolute [&>*+*]:after:inset-y-[9px] [&>*+*]:after:left-0 [&>*+*]:after:w-px [&>*+*]:after:translate-x-1/2 [&>*+*]:after:bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.16),rgba(0,0,0,0))]",
);

const segmentedItemClassName = cn(
  "[&_.app-button]:rounded-none [&_.app-button]:border-transparent [&_.app-button]:bg-transparent [&_.app-button]:shadow-none",
  "[&_.app-button]:text-[rgb(var(--text)/0.86)] [&_.app-button:hover]:bg-white/[0.02] [&_.app-button:active]:bg-white/[0.04]",
  "[&_.app-button]:focus-visible:ring-[var(--button-focus-ring)] [&_.app-button]:focus-visible:ring-inset",
  "[&>a]:rounded-none [&>a]:border-transparent [&>a]:bg-transparent [&>a]:shadow-none",
  "[&>a]:text-[rgb(var(--text)/0.86)] [&>a:hover]:bg-white/[0.02] [&>a:active]:bg-white/[0.04]",
  "[&>button]:rounded-none [&>button]:border-transparent [&>button]:bg-transparent [&>button]:shadow-none",
  "[&>button]:text-[rgb(var(--text)/0.86)] [&>button:hover]:bg-white/[0.02] [&>button:active]:bg-white/[0.04]",
  "[&>form_.app-button]:rounded-none [&>form_.app-button]:border-transparent [&>form_.app-button]:bg-transparent [&>form_.app-button]:shadow-none",
  "[&>form_.app-button]:text-[rgb(var(--text)/0.86)] [&>form_.app-button:hover]:bg-white/[0.02] [&>form_.app-button:active]:bg-white/[0.04]",
);

const segmentedUtilityRowClassName = cn(
  segmentedSurfaceClassName,
  "[&>*]:min-h-11 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-0",
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

function SegmentedRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid items-stretch", segmentedSurfaceClassName, itemBaseClassName, className)}>{children}</div>;
}

const dominantPrimaryClassName = cn(
  "[&_.app-button]:min-h-[3.25rem] [&_.app-button]:rounded-[1.08rem] [&_.app-button]:border-transparent [&_.app-button]:shadow-[0_10px_26px_rgba(16,185,129,0.18)]",
  "[&_.app-button]:focus-visible:ring-offset-0",
  "[&>a]:min-h-[3.25rem] [&>a]:rounded-[1.08rem] [&>a]:border-transparent [&>a]:shadow-[0_10px_26px_rgba(16,185,129,0.18)]",
  "[&>a]:focus-visible:ring-2 [&>a]:focus-visible:ring-[var(--button-focus-ring)] [&>a]:focus-visible:ring-offset-0",
  "[&>button]:min-h-[3.25rem] [&>button]:rounded-[1.08rem] [&>button]:border-transparent [&>button]:shadow-[0_10px_26px_rgba(16,185,129,0.18)]",
  "[&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-[var(--button-focus-ring)] [&>button]:focus-visible:ring-offset-0",
  "[&>form_.app-button]:min-h-[3.25rem] [&>form_.app-button]:rounded-[1.08rem] [&>form_.app-button]:border-transparent [&>form_.app-button]:shadow-[0_10px_26px_rgba(16,185,129,0.18)]",
  "[&>form_.app-button]:focus-visible:ring-offset-0",
);

export function BottomActionSingle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, "grid grid-cols-1 gap-2", itemBaseClassName, dominantPrimaryClassName, className)}>{children}</div>;
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, className)}>
      <SegmentedRow className="grid-cols-2 [&>*]:h-full [&>*]:min-w-0 [&>*]:basis-0">
        <BottomActionSlot className={segmentedItemClassName}>{secondary}</BottomActionSlot>
        <BottomActionSlot className={segmentedItemClassName}>{primary}</BottomActionSlot>
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
        <BottomActionSlot className={cn(segmentedItemClassName, secondaryClassName)}>{secondary}</BottomActionSlot>
        <BottomActionSlot
          className={cn(
            "px-1.5 justify-self-stretch [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[6.5rem]",
            CONTROL_LABEL_CLASSNAME,
            tertiaryClassName,
          )}
          fill={tertiaryFill}
        >
          {tertiary}
        </BottomActionSlot>
        <BottomActionSlot className={cn(segmentedItemClassName, primaryClassName)}>{primary}</BottomActionSlot>
      </SegmentedRow>
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

export function BottomActionStackedPrimary({ utility, primary, className }: { utility?: ReactNode; primary: ReactNode; className?: string }) {
  return (
    <div className={cn(BOTTOM_ACTION_SURFACE_INNER_CLASSNAME, "grid grid-cols-1 gap-2", itemBaseClassName, className)}>
      {utility ? <BottomActionUtilityRow>{utility}</BottomActionUtilityRow> : null}
      <div className={cn("grid grid-cols-1 gap-2", dominantPrimaryClassName)}>{primary}</div>
    </div>
  );
}

export const BottomActionTriple = BottomActionTriad;
export const BottomActionStack = BottomActionStackedPrimary;
