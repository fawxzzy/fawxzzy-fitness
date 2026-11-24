"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import type { CuratedStepId } from "../types.ts";

export type CuratedProgressStep = {
  id: CuratedStepId;
  /** Short name of the page ("Main Goal"). */
  label: string;
  available: boolean;
  /** "complete": every required question answered (shown as a Done chip); "needs-answers": at least one is not (no chip, counted in the sheet summary); null: nothing to answer (Review). */
  status: "complete" | "needs-answers" | null;
};

// One compact progress card: the step name + "Step 2 of 10" and the bar, plus ONE 44px "Steps" button that opens a
// sheet listing every page with its status (the old ten 28px number dots could not be tapped reliably and could not
// say which pages still needed answers).
export function CuratedOnboardingProgress({
  currentStep,
  totalSteps,
  progress,
  steps,
  onStepSelect,
}: {
  currentStep: number;
  totalSteps: number;
  progress: number;
  steps: CuratedProgressStep[];
  onStepSelect: (stepId: CuratedStepId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = steps[currentStep - 1];
  const needsAnswers = steps.filter((step) => step.status === "needs-answers").length;

  return (
    <div
      className="rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.34)] px-4 pb-3.5 pt-1.5"
      data-curated-progress="true"
      aria-label={`Step ${currentStep} of ${totalSteps}, ${progress}% complete`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[length:var(--type-caption)] font-medium text-[rgb(var(--text-muted)/0.94)]">
            Step {currentStep} of {totalSteps}
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {progress}% done
          </p>
          {current ? (
            <p className="truncate text-[length:var(--type-body)] font-semibold text-[rgb(var(--text-primary))]">{current.label}</p>
          ) : null}
        </div>
        <AppButton
          variant="quiet"
          size="sm"
          fullWidth={false}
          aria-haspopup="dialog"
          aria-label="Steps"
          data-curated-steps-trigger="true"
          onClick={() => setOpen(true)}
        >
          Steps
        </AppButton>
      </div>

      <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-[rgb(var(--border-strong)/0.18)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.72),rgb(var(--accent-divider-rgb)),rgb(var(--accent)/0.88))] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Sheet
        open={open}
        title="Setup steps"
        description={needsAnswers > 0 ? `${needsAnswers} of ${steps.filter((step) => step.status !== null).length} pages still need answers.` : "Every page is answered."}
        onClose={() => setOpen(false)}
      >
        <nav aria-label="Edit setup pages" className="flex flex-col gap-2 pb-2">
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
                data-curated-step-row={step.id}
                onClick={() => {
                  setOpen(false);
                  onStepSelect(step.id);
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl !border px-3 py-2 text-left transition-colors",
                  isCurrent
                    ? "!border-[rgb(var(--accent)/0.6)] !bg-[rgb(var(--accent)/0.14)] !text-[rgb(var(--text-primary))] !opacity-100"
                    : "!border-[rgb(var(--border-strong)/0.2)] !bg-[rgb(var(--surface-1-rgb)/0.34)] !text-[rgb(var(--text-primary))]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[length:var(--type-caption)] font-semibold tabular-nums",
                    isCurrent
                      ? "bg-[rgb(var(--accent))] text-[rgb(var(--surface-0-rgb))]"
                      : "border border-[rgb(var(--border-strong)/0.34)] text-[rgb(var(--text-secondary))]",
                  )}
                >
                  {stepNumber}
                </span>
                <span className="min-w-0 flex-1 text-[length:var(--type-body)] font-medium leading-5">{step.label}</span>
                {step.status === "complete" ? <Chip tone="success">Done</Chip> : null}
              </button>
            );
          })}
        </nav>
      </Sheet>
    </div>
  );
}
