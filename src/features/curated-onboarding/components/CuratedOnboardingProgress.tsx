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
    <div className="space-y-1.5" aria-label={`Step ${currentStep} of ${totalSteps}, ${progress}% complete`}>
      <div className="flex items-center justify-between gap-3 px-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
        <span>Step {currentStep} of {totalSteps}</span>
        <span className="text-[rgb(var(--accent)/0.92)]">{progress}%</span>
      </div>

      <div className="h-[3px] overflow-hidden rounded-full bg-[rgb(var(--border-strong)/0.18)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.72),rgb(var(--accent-divider-rgb)),rgb(var(--accent)/0.88))] shadow-[0_0_12px_rgb(var(--accent-divider-rgb)/0.52)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
