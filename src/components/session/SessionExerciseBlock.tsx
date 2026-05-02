import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { getBottomActionButtonClassName, type BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { cn } from "@/lib/cn";

export function SessionExerciseBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full pb-4", className)}>{children}</div>;
}

export function SessionExerciseCard({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

const ATTACHED_CARD_ACTION_STRIP_SHELL_CLASS_NAME = "-mt-px overflow-hidden rounded-b-[1.05rem] border-0 bg-[rgb(var(--surface-1-rgb)/0.16)]";

export function AttachedCardActionStripFrame({
  children,
  className,
  gridClassName = "grid-cols-2",
}: {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
}) {
  return (
    <div className={cn(ATTACHED_CARD_ACTION_STRIP_SHELL_CLASS_NAME, className)}>
      <div className={cn("grid min-h-11", gridClassName)}>
        {children}
      </div>
    </div>
  );
}

export function getAttachedCardActionButtonClassName({
  intent,
  className,
}: {
  intent?: BottomActionIntent;
  className?: string;
}) {
  return getBottomActionButtonClassName({
    intent,
    className: cn("!min-h-0 !h-11 !rounded-none !border-0 !px-4", className),
  });
}

export function AttachedQuickActionStrip({
  rowContract,
  onPress,
  onSkip,
  className,
}: {
  rowContract: {
    label: string;
    skipLabel: string;
    quickLogActionClassName?: string;
    skipActionClassName?: string;
    skipActionIntent?: "danger" | "info" | "positive" | "toggleInactive" | "toggleActive";
    actionRowClassName?: string;
    isSkipPending: boolean;
    isQuickLogPending: boolean;
    isQuickLogDisabled: boolean;
    isSkipDisabled: boolean;
    quickLogDisabledMessage: string;
  };
  onPress: () => Promise<void> | void;
  onSkip?: () => Promise<void> | void;
  className?: string;
}) {
  const actionRowClassName = rowContract.actionRowClassName;
  const skipActionClassName = rowContract.skipActionClassName;
  const quickLogActionClassName = rowContract.quickLogActionClassName;
  const isBusy = rowContract.isSkipPending || rowContract.isQuickLogPending;
  const isSkipDisabled = isBusy || rowContract.isSkipDisabled || !onSkip;
  const isQuickLogDisabled = isBusy || rowContract.isQuickLogDisabled;
  const quickLogLabel = rowContract.isQuickLogDisabled
    ? rowContract.quickLogDisabledMessage
    : rowContract.isQuickLogPending
      ? "Adding..."
      : rowContract.label;
  const skipLabel = rowContract.isSkipPending ? "Saving..." : rowContract.skipLabel;

  return (
    <AttachedCardActionStripFrame className={className} gridClassName="grid-cols-[4.75rem_minmax(0,1fr)]">
      <button
        type="button"
        onClick={onSkip}
        disabled={isSkipDisabled}
        data-bottom-action-intent={rowContract.skipActionIntent}
        className={cn(
          getAttachedCardActionButtonClassName({
            intent: rowContract.skipActionIntent ?? "danger",
            className: "relative z-10 border-r border-[rgb(var(--danger-rgb)/0.18)] text-[0.9rem] focus-visible:ring-[rgb(var(--danger-rgb)/0.2)]",
          }),
          rowContract.isSkipDisabled ? "border-r-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-muted)/0.92)] text-[rgb(var(--text-muted)/0.82)] shadow-none" : undefined,
          skipActionClassName,
        )}
      >
        {skipLabel}
      </button>
      <button
        type="button"
        onClick={onPress}
        disabled={isQuickLogDisabled}
        data-bottom-action-intent="positive"
        className={cn(
          getAttachedCardActionButtonClassName({
            intent: "positive",
            className: "relative min-w-0 overflow-hidden text-[rgb(var(--text-primary)/0.98)] focus-visible:ring-[rgb(var(--accent)/0.24)]",
          }),
          rowContract.isQuickLogPending
            ? "opacity-88"
            : isQuickLogDisabled
              ? "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-muted)/0.92)] text-[rgb(var(--text-muted)/0.82)] shadow-none"
              : "",
          actionRowClassName,
          quickLogActionClassName,
        )}
      >
        <div className="flex min-h-11 w-full items-center justify-center px-4 text-center">
          <p className={cn(appTokens.currentSessionLoggerSummaryText, "mt-0 whitespace-normal break-words text-center text-[14px] leading-[1.25] text-inherit")}>
            {quickLogLabel}
          </p>
        </div>
      </button>
    </AttachedCardActionStripFrame>
  );
}
