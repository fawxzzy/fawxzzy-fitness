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
  onPress,
  isPending,
  className,
}: {
  label?: string;
  onPress: () => Promise<void> | void;
  isPending?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mt-1.5 rounded-b-[1.05rem] border border-t-0 border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-2 pb-1.5 pt-1",
        className,
      )}
    >
      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={onPress}
        disabled={isPending}
        className="min-h-[38px] w-full border-white/8 bg-transparent text-[12px] font-medium text-[rgb(var(--text)/0.74)] shadow-none hover:bg-white/[0.05]"
      >
        {isPending ? "Adding…" : label}
      </AppButton>
    </div>
  );
}
