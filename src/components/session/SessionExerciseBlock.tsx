import type { ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
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

  return (
    <div
      className={cn(
        "mt-0.5 rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-2 py-1",
        className,
      )}
    >
      <div className={cn("grid grid-cols-3 items-stretch gap-2", actionRowClassName)}>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onSkip}
          disabled={rowContract.isSkipPending || !onSkip}
          className={cn(
            "col-span-1 min-h-[38px] border-white/8 bg-transparent px-2 text-[12px] font-medium shadow-none hover:bg-white/[0.05]",
            skipActionClassName,
          )}
        >
          {rowContract.isSkipPending ? "Saving…" : rowContract.skipLabel}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPress}
          disabled={rowContract.isQuickLogPending || rowContract.isQuickLogDisabled}
          className={cn("col-span-2 min-h-[38px] border-white/8 bg-transparent px-2 text-[12px] font-medium shadow-none hover:bg-white/[0.05]", quickLogActionClassName)}
        >
          {rowContract.isQuickLogDisabled ? rowContract.quickLogDisabledMessage : rowContract.isQuickLogPending ? "Adding…" : rowContract.label}
        </AppButton>
      </div>
    </div>
  );
}
