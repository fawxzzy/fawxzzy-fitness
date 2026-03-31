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
  quickLogLabelClassName,
  layoutClassName,
  onPress,
  onSkip,
  isSkipPending,
  isPending,
  className,
}: {
  label?: string;
  skipLabel?: string;
  quickLogLabelClassName?: string;
  layoutClassName?: string;
  onPress: () => Promise<void> | void;
  onSkip?: () => Promise<void> | void;
  isSkipPending?: boolean;
  isPending?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-1 rounded-[1.05rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-2 pb-1.5 pt-1",
        className,
      )}
    >
      <div className={cn("flex items-center gap-2", layoutClassName)}>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onSkip}
          disabled={isSkipPending || !onSkip}
          className="min-h-[38px] w-1/3 border-white/8 bg-transparent text-[12px] font-medium text-[rgb(var(--text)/0.74)] shadow-none hover:bg-white/[0.05]"
        >
          {isSkipPending ? "Saving…" : skipLabel}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPress}
          disabled={isPending}
          className={cn(
            "min-h-[38px] w-2/3 border-white/8 bg-transparent text-[12px] font-medium shadow-none hover:bg-white/[0.05]",
            quickLogLabelClassName,
          )}
        >
          {isPending ? "Adding…" : label}
        </AppButton>
      </div>
    </div>
  );
}
