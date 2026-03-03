import { SessionPageClient } from "@/components/SessionPageClient";
import { QuickAddExerciseSheet } from "./QuickAddExerciseSheet";
import { formatExerciseGoal } from "@/lib/exercise-goal-format";
import type { DisplayTarget } from "@/lib/session-targets";
import {
  addSetAction,
  removeExerciseAction,
  quickAddExerciseAction,
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

  const prefillWeight = target.weightMin ?? target.weightMax;
  if (prefillWeight !== undefined) {
    prefill.weight = prefillWeight;
    prefill.weightUnit = target.weightUnit ?? fallbackWeightUnit;
  }

  const prefillReps = target.repsMin ?? target.repsMax;
  if (prefillReps !== undefined) {
    prefill.reps = prefillReps;
  }

  if (target.durationSeconds !== undefined) {
    prefill.durationSeconds = target.durationSeconds;
  }

  return Object.keys(prefill).length > 0 ? prefill : undefined;
}

function formatSessionGoalLabel(target: DisplayTarget | undefined, fallbackWeightUnit: "lbs" | "kg") {
  const repsMin = target?.repsMin ?? target?.repsMax ?? null;
  const repsMax = target?.repsMax ?? target?.repsMin ?? null;

  return formatExerciseGoal({
    target_sets: target?.setsMin ?? target?.setsMax ?? null,
    target_reps: repsMin,
    target_reps_min: repsMin,
    target_reps_max: repsMax,
    target_weight: target?.weightMin ?? target?.weightMax ?? null,
    target_weight_unit: target?.weightUnit ?? fallbackWeightUnit,
    target_duration_seconds: target?.durationSeconds ?? null,
    target_distance: target?.distance ?? null,
    target_distance_unit: target?.distanceUnit ?? null,
    target_calories: target?.calories ?? null,
  });
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
  } = await getSessionPageData(params.id);

  const unitLabel = routine?.weight_unit ?? "kg";

  const exerciseById = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise]));

  const sessionTitle = `${sessionRow.name || "Routine"}: ${sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day")}`;

  return (
    <SessionPageClient
      sessionId={params.id}
      initialDurationSeconds={sessionRow.duration_seconds}
      performedAt={sessionRow.performed_at}
      sessionTitle={sessionTitle}
      searchError={searchParams?.error}
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
          goalLabel: formatSessionGoalLabel(displayTarget, unitLabel),
          prefill: getGoalPrefill(displayTarget, unitLabel),
          initialSets: setsByExercise.get(exercise.id) ?? [],
          loggedSetCount: (setsByExercise.get(exercise.id) ?? []).length,
        };
      })}
      saveSessionAction={saveSessionAction}
      quickAddAction={(
        <QuickAddExerciseSheet
          sessionId={params.id}
          exercises={exerciseOptions}
          quickAddExerciseAction={quickAddExerciseAction}
        />
      )}
      addSetAction={addSetAction}
      syncQueuedSetLogsAction={syncQueuedSetLogsAction}
      toggleSkipAction={toggleSkipAction}
      removeExerciseAction={removeExerciseAction}
      deleteSetAction={deleteSetAction}
    />
  );
}
