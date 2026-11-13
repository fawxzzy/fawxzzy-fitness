import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import type { CuratedGenerationStatus } from "../types.ts";
import type { CuratedWorkoutPlan } from "../engine.ts";
import { getCuratedHandoffPresentation, type CuratedHandoffFailure } from "../handoff.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

function formatExerciseTarget(exercise: CuratedWorkoutPlan["days"][number]["exercises"][number]) {
  if (exercise.targetDurationSeconds) {
    return `${exercise.targetSets}x${Math.round(exercise.targetDurationSeconds / 60)} min`;
  }
  return `${exercise.targetSets}x${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
}

export function GenerationHandoffStep({
  generationStatus,
  plan,
  failure,
  notice,
}: {
  generationStatus: CuratedGenerationStatus;
  plan: CuratedWorkoutPlan | null;
  /** Why generation did not produce a routine. A plan is never rendered while this is set. */
  failure: CuratedHandoffFailure | null;
  /** Recoverable problem from the last create attempt; the reviewed routine stays visible. */
  notice: string | null;
}) {
  const copy = getCuratedHandoffPresentation({ status: generationStatus, failure });
  const visiblePlan = failure ? null : plan;

  return (
    <div className="space-y-3">
      <CuratedInfoCard tone={copy.tone} compact>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{copy.title}</p>
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--accent)/0.94)]">
            {copy.badge}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">{copy.body}</p>
      </CuratedInfoCard>

      {visiblePlan ? (
        <div className="space-y-3">
          <CuratedInfoCard compact>
            <SignatureInlineList
              separator="pipe"
              items={visiblePlan.rationale}
              className="text-[10px] font-medium leading-5 text-[rgb(var(--text-secondary)/0.92)]"
            />
          </CuratedInfoCard>

          {visiblePlan.days.map((day) => (
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

      {failure && failure.code !== "safety-clearance-required" ? (
        <CuratedInfoCard compact tone="danger">
          <p className="text-xs leading-5 text-[rgb(var(--danger-rgb))]">{failure.message}</p>
        </CuratedInfoCard>
      ) : null}

      {notice ? (
        <CuratedInfoCard compact tone="warning">
          <p role="status" className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.94)]">{notice}</p>
        </CuratedInfoCard>
      ) : null}
    </div>
  );
}
