import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME = "pt-0.5 pb-[var(--app-dock-safe-padding-bottom)]";

const BOTTOM_ACTION_ARIA_LABEL = "Bottom actions";
const BOTTOM_ACTION_GROUP_CLASSNAME = "grid items-stretch gap-1.5";
export const BOTTOM_ACTION_SURFACE_INNER_CLASSNAME = BOTTOM_ACTION_GROUP_CLASSNAME;

const CONTROL_LABEL_CLASSNAME = cn(
  "[&_.bottom-action]:leading-[1.08] [&_.bottom-action]:text-center [&_.bottom-action]:whitespace-normal",
  "[&_.bottom-action__label]:flex [&_.bottom-action__label]:min-w-0 [&_.bottom-action__label]:flex-1",
  "[&_.bottom-action__label]:items-center [&_.bottom-action__label]:justify-center [&_.bottom-action__label]:text-center [&_.bottom-action__label]:self-center",
  "[&_.action-chrome]:leading-[1.08] [&_.action-chrome]:text-center [&_.action-chrome]:whitespace-normal",
  "[&_.action-chrome>span:last-child]:flex [&_.action-chrome>span:last-child]:min-w-0 [&_.action-chrome>span:last-child]:flex-1",
  "[&_.action-chrome>span:last-child]:items-center [&_.action-chrome>span:last-child]:justify-center [&_.action-chrome>span:last-child]:text-center [&_.action-chrome>span:last-child]:self-center",
  "[&_.action-chrome>span:last-child]:leading-[1.08]",
  "[&>a.bottom-action]:leading-[1.08] [&>a.bottom-action]:text-center [&>a.bottom-action]:whitespace-normal",
  "[&>button.bottom-action]:leading-[1.08] [&>button.bottom-action]:text-center [&>button.bottom-action]:whitespace-normal",
  "[&>a.action-chrome]:leading-[1.08] [&>a.action-chrome]:text-center [&>a.action-chrome]:whitespace-normal",
  "[&>a.action-chrome>span:last-child]:flex [&>a.action-chrome>span:last-child]:min-w-0 [&>a.action-chrome>span:last-child]:flex-1",
  "[&>a.action-chrome>span:last-child]:items-center [&>a.action-chrome>span:last-child]:justify-center [&>a.action-chrome>span:last-child]:text-center [&>a.action-chrome>span:last-child]:self-center",
  "[&>a.action-chrome>span:last-child]:leading-[1.08]",
  "[&>button.action-chrome]:leading-[1.08] [&>button.action-chrome]:text-center [&>button.action-chrome]:whitespace-normal",
  "[&>button.action-chrome>span:last-child]:flex [&>button.action-chrome>span:last-child]:min-w-0 [&>button.action-chrome>span:last-child]:flex-1",
  "[&>button.action-chrome>span:last-child]:items-center [&>button.action-chrome>span:last-child]:justify-center [&>button.action-chrome>span:last-child]:text-center [&>button.action-chrome>span:last-child]:self-center",
  "[&>button.action-chrome>span:last-child]:leading-[1.08]",
  "[&>form]:flex [&>form]:h-full [&>form]:w-full [&>form]:items-stretch",
  "[&>form_.bottom-action]:h-full [&>form_.bottom-action]:w-full",
  "[&>form_.action-chrome]:h-full [&>form_.action-chrome]:w-full",
);

const itemBaseClassName = cn(
  "[&>*]:min-w-0",
  CONTROL_LABEL_CLASSNAME,
);

function BottomActionSlot({
  children,
  className,
  fill = true,
}: {
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-stretch justify-center self-stretch",
        fill ? "[&>*]:w-full [&>form]:w-full [&>form>*]:w-full" : "shrink-0 [&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

function BottomActionUtilityRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-0",
        itemBaseClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BottomActionSingle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label={BOTTOM_ACTION_ARIA_LABEL}
      data-layout="single"
      className={cn(BOTTOM_ACTION_GROUP_CLASSNAME, "grid-cols-1", itemBaseClassName, className)}
    >
      {children}
    </div>
  );
}

export function BottomActionSplit({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label={BOTTOM_ACTION_ARIA_LABEL}
      data-layout="split"
      className={cn(
        BOTTOM_ACTION_GROUP_CLASSNAME,
        "grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]",
        itemBaseClassName,
        className,
      )}
    >
      <BottomActionSlot>{secondary}</BottomActionSlot>
      <BottomActionSlot>{primary}</BottomActionSlot>
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
    <div
      role="group"
      aria-label={BOTTOM_ACTION_ARIA_LABEL}
      data-layout="triad"
      className={cn(
        BOTTOM_ACTION_GROUP_CLASSNAME,
        "grid-cols-[minmax(112px,0.92fr)_minmax(5.75rem,7.25rem)_minmax(0,1.42fr)]",
        itemBaseClassName,
        className,
      )}
    >
      <BottomActionSlot className={secondaryClassName}>{secondary}</BottomActionSlot>
      <BottomActionSlot
        className={cn(
          "px-0.5 justify-self-stretch [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[6.5rem]",
          CONTROL_LABEL_CLASSNAME,
          tertiaryClassName,
        )}
        fill={tertiaryFill}
      >
        {tertiary}
      </BottomActionSlot>
      <BottomActionSlot className={primaryClassName}>{primary}</BottomActionSlot>
    </div>
  );
}

export function BottomActionUtilityCluster({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label={BOTTOM_ACTION_ARIA_LABEL}
      data-layout="utility"
      className={cn(BOTTOM_ACTION_GROUP_CLASSNAME, "grid-cols-1", className)}
    >
      <BottomActionUtilityRow>{children}</BottomActionUtilityRow>
    </div>
  );
}

export function BottomActionStackedPrimary({ utility, primary, className }: { utility?: ReactNode; primary: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label={BOTTOM_ACTION_ARIA_LABEL}
      data-layout="stacked"
        className={cn("grid items-stretch gap-2", className)}
    >
      {utility ? <BottomActionUtilityRow>{utility}</BottomActionUtilityRow> : null}
      <div className={cn(BOTTOM_ACTION_GROUP_CLASSNAME, "grid-cols-1", itemBaseClassName)}>{primary}</div>
    </div>
  );
}

export const BottomActionTriple = BottomActionTriad;
export const BottomActionStack = BottomActionStackedPrimary;
