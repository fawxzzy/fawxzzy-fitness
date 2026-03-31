import { SessionPageClient } from "@/components/SessionPageClient";
import { AppShell } from "@/components/ui/app/AppShell";
import { QuickAddExerciseSheet } from "./QuickAddExerciseSheet";
import { formatExerciseGoal } from "@/lib/exercise-goal-format";
import { isCardioExercise } from "@/lib/exercise-metadata";
import { usesIntervalLanguage } from "@/lib/log-set-language";
import { formatExerciseCountMetaLabel } from "@/lib/header-meta";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import type { DisplayTarget } from "@/lib/session-targets";
import {
  addSetAction,
  removeExerciseAction,
  deleteSetAction,
  saveSessionAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
} from "./actions";
import { getSessionPageData } from "./queries";
import { isSafeAppPath } from "@/lib/navigation-return";

function buildSessionExerciseTarget(exercise: {
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
  target_sets_min?: number | null;
  target_sets_max?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight_min?: number | null;
  target_weight_max?: number | null;
  target_weight_unit?: "lbs" | "kg" | null;
  target_time_seconds_min?: number | null;
  target_time_seconds_max?: number | null;
  target_distance_min?: number | null;
  target_distance_max?: number | null;
  target_distance_unit?: "mi" | "km" | "m" | null;
  target_calories_min?: number | null;
  target_calories_max?: number | null;
}): DisplayTarget | null {
  const hasGoal = exercise.target_sets_min !== null
    || exercise.target_sets_max !== null
    || exercise.target_reps_min !== null
    || exercise.target_reps_max !== null
    || exercise.target_weight_min !== null
    || exercise.target_weight_max !== null
    || exercise.target_time_seconds_min !== null
    || exercise.target_time_seconds_max !== null
    || exercise.target_distance_min !== null
    || exercise.target_distance_max !== null
    || exercise.target_calories_min !== null
    || exercise.target_calories_max !== null;

  if (!hasGoal) {
    return null;
  }

  return {
    source: "engine",
    measurementType: exercise.measurement_type ?? "reps",
    setsMin: exercise.target_sets_min ?? undefined,
    setsMax: exercise.target_sets_max ?? undefined,
    repsMin: exercise.target_reps_min ?? undefined,
    repsMax: exercise.target_reps_max ?? undefined,
    weightMin: exercise.target_weight_min ?? undefined,
    weightMax: exercise.target_weight_max ?? undefined,
    weightUnit: exercise.target_weight_unit ?? undefined,
    durationSeconds: exercise.target_time_seconds_min ?? exercise.target_time_seconds_max ?? undefined,
    distance: exercise.target_distance_min ?? exercise.target_distance_max ?? undefined,
    distanceUnit: exercise.target_distance_unit ?? undefined,
    calories: exercise.target_calories_min ?? exercise.target_calories_max ?? undefined,
  };
}

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

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    exerciseId?: string;
    returnTo?: string;
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
  const sessionSummary = formatExerciseCountMetaLabel(sessionExercises.length);

  const requestedReturnTo = isSafeAppPath(searchParams?.returnTo) ? searchParams?.returnTo : undefined;

  return (
    <AppShell topNavMode="none">
        <SessionPageClient
          sessionId={params.id}
          initialDurationSeconds={sessionRow.duration_seconds}
          performedAt={sessionRow.performed_at}
          sessionTitle={sessionTitle}
          sessionSummary={sessionSummary}
          searchError={searchParams?.error}
          unitLabel={unitLabel}
          exercises={sessionExercises.map((exercise) => {
            const displayTarget = buildSessionExerciseTarget(exercise) ?? sessionTargets.get(exercise.id);
            const canonicalExercise = exerciseById.get(exercise.exercise_id);
            const exerciseMetadata = {
              measurement_type: exercise.measurement_type ?? canonicalExercise?.measurement_type ?? null,
              equipment: canonicalExercise?.equipment ?? null,
              movement_pattern: canonicalExercise?.movement_pattern ?? null,
            };
            const isCardio = isCardioExercise(exerciseMetadata);
            const useIntervalLanguage = usesIntervalLanguage({
              intervalMode: false,
            });

            return {
              id: exercise.id,
              exerciseId: exercise.exercise_id,
              name: normalizeExerciseDisplayName({ exerciseId: exercise.exercise_id, fallbackName: exerciseNameMap.get(exercise.exercise_id) ?? null }),
              isSkipped: exercise.is_skipped,
              defaultUnit: exercise.default_unit ?? null,
              isCardio,
              useIntervalLanguage,
              routineDayExerciseId: exercise.routine_day_exercise_id ?? null,
              image_howto_path: canonicalExercise?.image_howto_path ?? null,
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

                if (isCardio) {
                  return { reps: false, weight: false, time: true, distance: false, calories: false };
                }

                return { reps: true, weight: true, time: false, distance: false, calories: false };
              })(),
              goalLabel: formatSessionGoalLabel(displayTarget, unitLabel),
              prefill: getGoalPrefill(displayTarget, unitLabel),
              quickLogTarget: displayTarget ? {
                repsMin: displayTarget.repsMin,
                repsMax: displayTarget.repsMax,
                weightMin: displayTarget.weightMin,
                weightMax: displayTarget.weightMax,
                weightUnit: displayTarget.weightUnit,
                durationSeconds: displayTarget.durationSeconds,
                distance: displayTarget.distance,
                distanceUnit: displayTarget.distanceUnit,
                calories: displayTarget.calories,
                measurementType: displayTarget.measurementType,
              } : undefined,
              targetSetsMin: displayTarget?.setsMin ?? null,
              targetSetsMax: displayTarget?.setsMax ?? null,
              initialSets: setsByExercise.get(exercise.id) ?? [],
              loggedSetCount: (setsByExercise.get(exercise.id) ?? []).length,
            };
          })}
          saveSessionAction={saveSessionAction}
          requestedReturnTo={requestedReturnTo}
          quickAddAction={(
            <QuickAddExerciseSheet
              sessionId={params.id}
            />
          )}
          addSetAction={addSetAction}
          syncQueuedSetLogsAction={syncQueuedSetLogsAction}
          toggleSkipAction={toggleSkipAction}
          removeExerciseAction={removeExerciseAction}
          deleteSetAction={deleteSetAction}
        />
    </AppShell>
  );
}
