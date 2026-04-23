import type { ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export function SessionExerciseBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full", className)}>{children}</div>;
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

  return (
    <div
      className={cn(
        appTokens.currentSessionActionStrip,
        className,
      )}
    >
      <div className={cn(appTokens.currentSessionActionStripGrid, actionRowClassName)}>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onSkip}
          disabled={isSkipDisabled}
          data-action-chrome-intent={skipActionIntent}
          data-action-chrome-segmented="true"
          className={cn(
            appTokens.currentSessionActionButton,
            skipActionClassName,
          )}
        >
          {rowContract.isSkipPending ? "Saving..." : rowContract.skipLabel}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPress}
          disabled={isQuickLogDisabled}
          data-action-chrome-intent={quickLogActionIntent}
          data-action-chrome-segmented="true"
          className={cn(appTokens.currentSessionActionButtonWide, quickLogActionClassName)}
        >
          <span className="block truncate">
            {rowContract.isQuickLogDisabled ? rowContract.quickLogDisabledMessage : rowContract.isQuickLogPending ? "Adding..." : rowContract.label}
          </span>
        </AppButton>
      </div>
    </div>
  );
}
