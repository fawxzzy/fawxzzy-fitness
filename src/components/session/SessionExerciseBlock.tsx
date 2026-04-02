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
  label = "Quick Log: Set",
  skipLabel = "Skip",
  quickLogActionClassName,
  skipActionClassName,
  actionRowClassName,
  onPress,
  onSkip,
  isSkipPending,
  isPending,
  isQuickLogDisabled,
  className,
}: {
  label?: string;
  skipLabel?: string;
  quickLogActionClassName?: string;
  skipActionClassName?: string;
  actionRowClassName?: string;
  onPress: () => Promise<void> | void;
  onSkip?: () => Promise<void> | void;
  isSkipPending?: boolean;
  isPending?: boolean;
  isQuickLogDisabled?: boolean;
  className?: string;
}) {
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
          disabled={isSkipPending || !onSkip}
          className={cn(
            "col-span-1 min-h-[38px] border-white/8 bg-transparent px-2 text-[12px] font-medium shadow-none hover:bg-white/[0.05]",
            skipActionClassName,
          )}
        >
          {isSkipPending ? "Saving…" : skipLabel}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPress}
          disabled={isPending || isQuickLogDisabled}
          className={cn("col-span-2 min-h-[38px] border-white/8 bg-transparent px-2 text-[12px] font-medium shadow-none hover:bg-white/[0.05]", quickLogActionClassName)}
        >
          {isQuickLogDisabled ? "Unavailable while skipped" : isPending ? "Adding…" : label}
        </AppButton>
      </div>
    </div>
  );
}
