import { SessionExerciseFocus } from "@/components/SessionExerciseFocus";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { SessionAddExerciseForm } from "@/components/SessionAddExerciseForm";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { formatGoalStatLine, type DisplayTarget } from "@/lib/session-targets";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import {
  addExerciseAction,
  addSetAction,
  removeExerciseAction,
  deleteSetAction,
  saveSessionAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
} from "./actions";
import { getSessionPageData } from "./queries";

export const dynamic = "force-dynamic";

const customExerciseInputClass = "w-full rounded-md border border-border/70 bg-[rgb(var(--bg)/0.45)] px-3 py-2 text-sm text-text";

function getGoalPrefill(target: DisplayTarget | undefined, fallbackWeightUnit: "lbs" | "kg"): {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  weightUnit?: "lbs" | "kg";
} | undefined {
  if (!target) {
    return undefined;
  }

  const prefill: { weight?: number; reps?: number; durationSeconds?: number; weightUnit?: "lbs" | "kg" } = {};

  if (target.weight !== undefined) {
    prefill.weight = target.weight;
    prefill.weightUnit = target.weightUnit ?? fallbackWeightUnit;
  }

  if (target.repsText) {
    const repsMatch = target.repsText.match(/\d+/);
    if (repsMatch) {
      prefill.reps = Number(repsMatch[0]);
    }
  }

  if (target.durationSeconds !== undefined) {
    prefill.durationSeconds = target.durationSeconds;
  }

  return Object.keys(prefill).length > 0 ? prefill : undefined;
}


function hasCardioTag(exercise: unknown) {
  if (!exercise || typeof exercise !== "object") return false;
  const rawValues = [
    (exercise as { tags?: string[] | string | null }).tags,
    (exercise as { tag?: string[] | string | null }).tag,
    (exercise as { categories?: string[] | string | null }).categories,
    (exercise as { category?: string[] | string | null }).category,
  ];

  return rawValues.some((value) => {
    if (Array.isArray(value)) {
      return value.some((tag) => tag.toLowerCase() === "cardio");
    }
    if (typeof value === "string") {
      return value.split(",").some((tag) => tag.trim().toLowerCase() === "cardio");
    }
    return false;
  });
}

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    exerciseId?: string;
    addExerciseOpen?: string;
  };
};

export default async function SessionPage({ params, searchParams }: PageProps) {
  const {
    sessionRow,
    routine,
    sessionExercises,
    setsByExercise,
    sessionTargets,
    exerciseOptions,
    exerciseNameMap,
    customExercises,
    exerciseStatsByExerciseId,
  } = await getSessionPageData(params.id);

  const unitLabel = routine?.weight_unit ?? "kg";

  const exerciseById = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise]));

  return (
    <section className="space-y-4 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{sessionRow.name || "Routine"}: {sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day")}</h1>
        <SessionBackButton />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      <ActionFeedbackToasts />

      <CollapsibleCard title="Add exercises" summary={`${sessionExercises.length} added`} defaultOpen={searchParams?.addExerciseOpen === "1"}>
        <SessionAddExerciseForm
          sessionId={params.id}
          exercises={exerciseOptions}
          initialSelectedId={searchParams?.exerciseId}
          weightUnit={unitLabel}
          addExerciseAction={addExerciseAction}
          exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
          customExerciseSection={
            <CollapsibleCard
              title="Add custom exercise"
              summary={`${customExercises.length} saved`}
              defaultOpen={false}
              className="border border-border/60"
              bodyClassName="bg-[rgb(var(--bg)/0.35)]"
            >
              <form action={createCustomExerciseAction} className="space-y-2">
                <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className={customExerciseInputClass} />
                <AppButton type="submit" variant="secondary" fullWidth>Save Custom Exercise</AppButton>
              </form>

              {customExercises.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                  {customExercises.map((exercise) => (
                    <li key={exercise.id} className="rounded-md border border-border/60 bg-[rgb(var(--bg)/0.45)] p-2">
                      <p className="text-xs font-semibold text-text">{exercise.name}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <form action={renameCustomExerciseAction} className="flex gap-2">
                          <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                          <input type="hidden" name="exerciseId" value={exercise.id} />
                          <input name="name" defaultValue={exercise.name} minLength={2} maxLength={80} className={customExerciseInputClass} />
                          <AppButton type="submit" variant="secondary" size="sm">Rename</AppButton>
                        </form>
                        <ConfirmedServerFormButton
                          action={deleteCustomExerciseAction}
                          hiddenFields={{ returnTo: `/session/${params.id}`, exerciseId: exercise.id }}
                          triggerLabel="Delete"
                          triggerClassName="w-full"
                          modalTitle="Delete custom exercise?"
                          modalDescription="This permanently deletes this custom exercise from your library."
                          confirmLabel="Delete"
                          details={`Exercise: ${exercise.name}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CollapsibleCard>
          }
        />
      </CollapsibleCard>

      <SessionHeaderControls
        sessionId={params.id}
        initialDurationSeconds={sessionRow.duration_seconds}
        performedAt={sessionRow.performed_at}
        saveSessionAction={saveSessionAction}
      />

      {sessionExercises.length > 0 ? (
        <SessionExerciseFocus
          sessionId={params.id}
          unitLabel={unitLabel}
          exercises={sessionExercises.map((exercise) => {
            const displayTarget = sessionTargets.get(exercise.id);
            return {
              id: exercise.id,
              name: exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id,
              isSkipped: exercise.is_skipped,
              defaultUnit: exercise.default_unit ?? null,
              isCardio: hasCardioTag(exerciseById.get(exercise.exercise_id)),
              routineDayExerciseId: exercise.routine_day_exercise_id ?? null,
              planTargetsHash: (() => {
                const fromPlan = exercise.enabled_metrics;
                if (!fromPlan) {
                  return null;
                }
                return [fromPlan.reps, fromPlan.weight, fromPlan.time, fromPlan.distance, fromPlan.calories]
                  .map((value) => (value ? "1" : "0"))
                  .join("");
              })(),
              initialEnabledMetrics: (() => {
                const fromPlan = exercise.enabled_metrics;
                if (fromPlan && [fromPlan.reps, fromPlan.weight, fromPlan.time, fromPlan.distance, fromPlan.calories].some((value) => value === true)) {
                  return {
                    reps: fromPlan.reps === true,
                    weight: fromPlan.weight === true,
                    time: fromPlan.time === true,
                    distance: fromPlan.distance === true,
                    calories: fromPlan.calories === true,
                  };
                }

                if (hasCardioTag(exerciseById.get(exercise.exercise_id))) {
                  return { reps: false, weight: false, time: true, distance: false, calories: false };
                }

                return { reps: true, weight: true, time: false, distance: false, calories: false };
              })(),
              goalStatLine: displayTarget ? formatGoalStatLine(displayTarget, routine?.weight_unit ?? null) : null,
              prefill: getGoalPrefill(displayTarget, unitLabel),
              initialSets: setsByExercise.get(exercise.id) ?? [],
              loggedSetCount: (setsByExercise.get(exercise.id) ?? []).length,
            };
          })}
          addSetAction={addSetAction}
          syncQueuedSetLogsAction={syncQueuedSetLogsAction}
          toggleSkipAction={toggleSkipAction}
          removeExerciseAction={removeExerciseAction}
          deleteSetAction={deleteSetAction}
        />
      ) : null}

      {sessionExercises.length === 0 ? <p className="rounded-md border border-border/70 bg-surface/70 p-3 text-sm text-muted">No exercises in this session yet.</p> : null}

    </section>
  );
}
