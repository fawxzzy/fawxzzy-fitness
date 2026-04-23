import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SessionExerciseBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full pb-4", className)}>{children}</div>;
}

export function SessionExerciseCard({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function AttachedQuickActionStrip({
  rowContract,
  onPress,
  onSkip,
  className,
}: {
  rowContract: {
    label: string;
    skipLabel: "Skip" | "Unskip";
    quickLogActionIntent?: string;
    skipActionIntent?: string;
    quickLogActionClassName?: string;
    skipActionClassName?: string;
    actionRowClassName?: string;
    isSkipPending: boolean;
    isQuickLogPending: boolean;
    isQuickLogDisabled: boolean;
    quickLogDisabledMessage: string;
  };
  onPress: () => Promise<void> | void;
  onSkip?: () => Promise<void> | void;
  className?: string;
}) {
  const actionRowClassName = rowContract.actionRowClassName;
  const skipActionClassName = rowContract.skipActionClassName;
  const quickLogActionClassName = rowContract.quickLogActionClassName;
  const skipActionIntent = rowContract.skipActionIntent ?? "danger";
  const quickLogActionIntent = rowContract.quickLogActionIntent ?? "positive";
  const isBusy = rowContract.isSkipPending || rowContract.isQuickLogPending;
  const isSkipDisabled = isBusy || !onSkip;
  const isQuickLogDisabled = isBusy || rowContract.isQuickLogDisabled;
  const stripSurfaceClassName = isQuickLogDisabled
    ? "bg-[linear-gradient(180deg,rgba(58,127,123,0.56),rgba(34,76,76,0.7))]"
    : "bg-[linear-gradient(180deg,rgba(78,214,192,0.95),rgba(40,146,129,0.98))]";
  const quickLogLabel = rowContract.isQuickLogDisabled
    ? rowContract.quickLogDisabledMessage
    : rowContract.isQuickLogPending
      ? "Adding..."
      : rowContract.label;
  const skipLabel = rowContract.isSkipPending ? "Saving..." : rowContract.skipLabel;

  return (
    <div
      className={cn(
        "relative -mt-px overflow-hidden rounded-bl-none rounded-tr-[0.95rem] rounded-br-[var(--card-radius)] border border-t-0 border-[rgb(var(--border-strong)/0.18)]",
        stripSurfaceClassName,
        className,
      )}
    >
      <div className={cn("relative min-h-11", actionRowClassName)}>
        <button
          type="button"
          onClick={onPress}
          disabled={isQuickLogDisabled}
          className={cn(
            "relative h-11 w-full rounded-none border-0 bg-transparent text-[rgb(var(--text)/0.96)] transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.24)] disabled:cursor-not-allowed disabled:opacity-60",
            quickLogActionClassName,
          )}
        >
          <span className="block truncate pl-[4.75rem] pr-[1.15rem] text-center text-[0.95rem] font-semibold">
            {quickLogLabel}
          </span>
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipDisabled}
          className={cn(
            "absolute left-0 top-0 z-10 flex h-11 w-[4.75rem] items-center justify-center rounded-none border-0 border-r border-[rgb(var(--border-strong)/0.16)] bg-[linear-gradient(180deg,rgba(37,42,56,0.99),rgba(19,23,32,0.99))] text-[0.9rem] font-semibold text-[rgb(248_234_205/0.96)] transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--warning-rgb)/0.2)] disabled:cursor-not-allowed disabled:opacity-60",
            skipActionClassName,
          )}
        >
          {skipLabel}
        </button>
      </div>
    </div>
  );
}
