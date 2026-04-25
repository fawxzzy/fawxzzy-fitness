import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

const enabledQuickLogStyle = {
  backgroundColor: "rgb(var(--accent))",
  color: "rgb(var(--text-on-accent))",
} as const;

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
  const isBusy = rowContract.isSkipPending || rowContract.isQuickLogPending;
  const isSkipDisabled = isBusy || !onSkip;
  const isQuickLogDisabled = isBusy || rowContract.isQuickLogDisabled;
  const quickLogLabel = rowContract.isQuickLogDisabled
    ? rowContract.quickLogDisabledMessage
    : rowContract.isQuickLogPending
      ? "Adding..."
      : rowContract.label;
  const skipLabel = rowContract.isSkipPending ? "Saving..." : rowContract.skipLabel;

  return (
    <div
      className={cn(
        "relative grid min-h-11 grid-cols-[4.75rem_minmax(0,1fr)] overflow-hidden rounded-none border-t border-[rgb(var(--border-strong)/0.18)] bg-transparent",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSkip}
        disabled={isSkipDisabled}
        className={cn(
          "relative z-10 flex h-11 items-center justify-center rounded-none border-0 border-r border-[rgb(var(--border-strong)/0.18)] bg-[linear-gradient(180deg,rgba(40,47,63,0.99),rgba(20,25,35,0.99))] text-[0.9rem] font-semibold text-[rgb(248_234_205/0.96)] transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--warning-rgb)/0.2)] disabled:cursor-not-allowed disabled:text-[rgb(var(--text-muted)/0.72)]",
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
          isQuickLogDisabled
            ? "bg-[linear-gradient(180deg,rgba(82,154,137,0.72),rgba(45,90,81,0.86))] text-[rgb(221_236_230/0.86)]"
            : "",
          actionRowClassName,
          quickLogActionClassName,
        )}
        style={isQuickLogDisabled ? undefined : enabledQuickLogStyle}
      >
        <div className="flex min-h-11 w-full items-center justify-center px-4 text-center">
          <p className={cn(appTokens.currentSessionLoggerSummaryText, "mt-0 line-clamp-1 text-center text-[14px] leading-[1.25] text-inherit")}>
            {quickLogLabel}
          </p>
        </div>
      </button>
    </div>
  );
}
