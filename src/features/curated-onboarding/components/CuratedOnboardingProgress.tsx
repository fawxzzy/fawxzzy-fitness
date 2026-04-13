import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

export function CuratedOnboardingProgress({
  currentStep,
  totalSteps,
  progress,
}: {
  currentStep: number;
  totalSteps: number;
  progress: number;
}) {
  return (
    <div className="space-y-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Pill tone="success">Step {currentStep} / {totalSteps}</Pill>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Training intake</p>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{progress}% complete</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-emerald-400/70 via-emerald-300/80 to-white/80 transition-[width] duration-300 ease-out motion-reduce:transition-none",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
