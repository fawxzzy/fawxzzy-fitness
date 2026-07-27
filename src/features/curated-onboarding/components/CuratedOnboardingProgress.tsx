import type { CuratedStepId } from "../types.ts";

export function CuratedOnboardingProgress({
  currentStep,
  totalSteps,
  progress,
  title,
  steps,
  onStepSelect,
}: {
  currentStep: number;
  totalSteps: number;
  progress: number;
  title: string;
  steps: Array<{
    id: CuratedStepId;
    label: string;
    available: boolean;
  }>;
  onStepSelect: (stepId: CuratedStepId) => void;
}) {
  return (
    <div className="space-y-1.5" aria-label={`Step ${currentStep} of ${totalSteps}, ${progress}% complete`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
        <span>Step {currentStep} of {totalSteps}</span>
        <h1 className="min-w-0 text-center text-[12px] font-semibold leading-tight tracking-[-0.01em] text-[rgb(var(--text-primary))] normal-case sm:text-[14px]">
          {title}
        </h1>
        <span className="text-[rgb(var(--accent)/0.92)]">{progress}%</span>
      </div>

      <div className="h-[3px] overflow-hidden rounded-full bg-[rgb(var(--border-strong)/0.18)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.72),rgb(var(--accent-divider-rgb)),rgb(var(--accent)/0.88))] shadow-[0_0_12px_rgb(var(--accent-divider-rgb)/0.52)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <nav
        className="grid gap-1 pt-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label="Edit setup pages"
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;

          return (
            <button
              key={step.id}
              type="button"
              aria-label={`${isCurrent ? "Current page" : "Edit"}: ${step.label}`}
              aria-current={isCurrent ? "step" : undefined}
              disabled={!step.available || isCurrent}
              onClick={() => onStepSelect(step.id)}
              className={`min-h-7 rounded-full border text-[9px] font-semibold tabular-nums transition-colors ${
                isCurrent
                  ? "!border-[rgb(var(--accent))] !bg-[rgb(var(--accent))] !text-[rgb(var(--surface-0-rgb))] !opacity-100 shadow-[0_0_0_2px_rgb(var(--accent)/0.24),0_0_16px_rgb(var(--accent)/0.42)]"
                  : step.available
                    ? "border-[rgb(var(--border-strong)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.32)] text-[rgb(var(--text-secondary)/0.94)] hover:border-[rgb(var(--accent)/0.46)] hover:text-[rgb(var(--accent)/0.96)]"
                    : "cursor-not-allowed border-[rgb(var(--border-strong)/0.1)] bg-transparent text-[rgb(var(--text-muted)/0.38)]"
              }`}
            >
              {stepNumber}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
