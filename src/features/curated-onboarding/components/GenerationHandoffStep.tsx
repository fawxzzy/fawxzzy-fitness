import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import type { CuratedGenerationStatus } from "../types.ts";
import type { CuratedWorkoutPlan } from "../engine.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

function getStatusCopy(status: CuratedGenerationStatus) {
  if (status === "queued") {
    return {
      title: "Building your plan",
      body: "Building from your saved setup.",
      tone: "warning" as const,
    };
  }

  if (status === "ready") {
    return {
      title: "Your plan is ready to review",
      body: "Review the days below, then open the editable draft.",
      tone: "accent" as const,
    };
  }

  if (status === "failed") {
    return {
      title: "Plan generation failed",
      body: "Your setup is saved. Return and try again.",
      tone: "danger" as const,
    };
  }

  if (status === "not-implemented") {
    return {
      title: "Generation is not implemented yet",
      body: "Your setup is saved for a later retry.",
      tone: "accent" as const,
    };
  }

  return {
    title: "Intake saved locally",
    body: "Preparing the editable draft.",
    tone: "default" as const,
  };
}

function formatExerciseTarget(exercise: CuratedWorkoutPlan["days"][number]["exercises"][number]) {
  if (exercise.targetDurationSeconds) {
    return `${exercise.targetSets}x${Math.round(exercise.targetDurationSeconds / 60)} min`;
  }
  return `${exercise.targetSets}x${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
}

export function GenerationHandoffStep({
  generationStatus,
  plan,
  error,
}: {
  generationStatus: CuratedGenerationStatus;
  plan: CuratedWorkoutPlan | null;
  error: string | null;
}) {
  const copy = getStatusCopy(generationStatus);

  return (
    <div className="space-y-3">
      <CuratedInfoCard tone={copy.tone} compact>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{copy.title}</p>
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--accent)/0.94)]">
            {generationStatus === "ready" ? "Ready" : generationStatus === "failed" ? "Failed" : "Working"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">{copy.body}</p>
      </CuratedInfoCard>

      {plan ? (
        <div className="space-y-3">
          <CuratedInfoCard compact>
            <SignatureInlineList
              separator="pipe"
              items={plan.rationale}
              className="text-[10px] font-medium leading-5 text-[rgb(var(--text-secondary)/0.92)]"
            />
          </CuratedInfoCard>

          {plan.days.map((day) => (
            <CuratedInfoCard key={day.name} className="space-y-2.5">
              <p className="border-b border-[rgb(var(--accent)/0.35)] pb-1 text-sm font-semibold text-[rgb(var(--accent)/0.96)]">
                {day.name}
              </p>
              <div className="space-y-2">
                {day.exercises.map((exercise) => (
                  <div key={exercise.slug} className="flex min-w-0 items-center gap-2 text-xs leading-5">
                    <span className="min-w-0 flex-1 text-[rgb(var(--text-primary)/0.94)]">{exercise.name}</span>
                    <SignatureMiniPipe />
                    <span className="shrink-0 font-semibold text-[rgb(var(--text-secondary)/0.92)]">{formatExerciseTarget(exercise)}</span>
                  </div>
                ))}
              </div>
            </CuratedInfoCard>
          ))}
        </div>
      ) : null}

      {error ? (
        <CuratedInfoCard compact tone="danger">
          <p className="text-xs leading-5 text-[rgb(var(--danger-rgb))]">{error}</p>
        </CuratedInfoCard>
      ) : null}
    </div>
  );
}
