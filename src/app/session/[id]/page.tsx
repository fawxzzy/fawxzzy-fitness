import { SessionExerciseFocus } from "@/components/SessionExerciseFocus";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { SessionAddExerciseForm } from "@/components/SessionAddExerciseForm";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { AppButton } from "@/components/ui/AppButton";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { formatGoalStatLine, type DisplayTarget } from "@/lib/session-targets";
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

      <details className="group rounded-md border border-border/70 bg-surface/70 transition-colors hover:border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-2-soft active:bg-surface-2-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-details-marker]:hidden">
          <span>+ Add custom exercise</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180">
            <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <form action={createCustomExerciseAction} className="space-y-2">
            <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
            <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <AppButton type="submit" variant="secondary" fullWidth>Save Custom Exercise</AppButton>
          </form>

          {customExercises.length > 0 ? (
            <ul className="space-y-2 border-t border-slate-200 pt-3">
              {customExercises.map((exercise) => (
                <li key={exercise.id} className="rounded-md bg-slate-50 p-2">
                  <p className="text-xs font-semibold">{exercise.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <form action={renameCustomExerciseAction} className="flex gap-2">
                      <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <input name="name" defaultValue={exercise.name} minLength={2} maxLength={80} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs" />
                      <AppButton type="submit" variant="secondary" size="sm">Rename</AppButton>
                    </form>
                    <form action={deleteCustomExerciseAction}>
                      <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <AppButton type="submit" variant="destructive" size="sm" fullWidth>Delete</AppButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>

      <CollapsibleCard title="Add exercises" summary={`${sessionExercises.length} added`} defaultOpen={searchParams?.addExerciseOpen === "1"}>
        <SessionAddExerciseForm
          sessionId={params.id}
          exercises={exerciseOptions}
          initialSelectedId={searchParams?.exerciseId}
          weightUnit={unitLabel}
          addExerciseAction={addExerciseAction}
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
