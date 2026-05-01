import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { getBottomActionButtonClassName, type BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { cn } from "@/lib/cn";

const enabledQuickLogStyle = {
  backgroundColor: "rgb(var(--accent))",
  color: "rgb(var(--text-on-accent))",
} as const;

const pendingQuickLogStyle = {
  backgroundColor: "rgb(var(--accent) / 0.84)",
  color: "rgb(var(--text-on-accent))",
} as const;

export function SessionExerciseBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full pb-4", className)}>{children}</div>;
}

export function SessionExerciseCard({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

const ATTACHED_CARD_ACTION_STRIP_SHELL_CLASS_NAME = "-mt-px overflow-hidden rounded-b-[1.05rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] border-t-0 bg-[rgb(var(--surface-1-rgb)/0.16)]";

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
          "relative z-10 flex h-11 items-center justify-center rounded-none border-0 border-r border-[rgb(var(--danger-rgb)/0.2)] bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.18),rgb(var(--surface-1-rgb)/0.98))] text-[0.9rem] font-semibold text-[rgb(var(--button-destructive-text))] transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--danger-rgb)/0.2)] disabled:cursor-not-allowed disabled:text-[rgb(var(--text-muted)/0.72)]",
          rowContract.isSkipDisabled ? "border-[rgb(var(--border-strong)/0.18)] bg-[linear-gradient(180deg,rgba(57,64,76,0.98),rgba(32,37,45,0.98))] text-[rgb(var(--text-muted)/0.82)]" : undefined,
          skipActionClassName,
        )}
      >
        {skipLabel}
      </button>
      <button
        type="button"
        onClick={onPress}
        disabled={isQuickLogDisabled}
        className={cn(
          "relative flex h-11 min-w-0 items-center justify-center overflow-hidden rounded-none border-0 transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.24)] disabled:cursor-not-allowed",
          rowContract.isQuickLogPending
            ? "opacity-88"
            : isQuickLogDisabled
              ? "bg-[linear-gradient(180deg,rgba(57,64,76,0.98),rgba(32,37,45,0.98))] text-[rgb(var(--text-muted)/0.82)]"
              : "",
          actionRowClassName,
          quickLogActionClassName,
        )}
        style={rowContract.isQuickLogPending ? pendingQuickLogStyle : (isQuickLogDisabled ? undefined : enabledQuickLogStyle)}
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
