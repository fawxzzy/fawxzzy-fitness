import { isRedirectError } from "next/dist/client/components/redirect";
import { SessionPageClient } from "@/components/SessionPageClient";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { AppShell } from "@/components/ui/app/AppShell";
import { QuickAddExerciseSheet } from "./QuickAddExerciseSheet";
import { SessionOfflineBridge } from "./SessionOfflineBridge";
import { SessionOfflineShell } from "./SessionOfflineShell";
import { requireUser } from "@/lib/auth";
import { formatExerciseGoalSummary, resolveExerciseGoalCurrentReps } from "@/lib/exercise-goal-format";
import { resolveCaloriesEstimationMethod, withEstimatedCaloriesForTarget, type CalorieEstimationExerciseInput } from "@/lib/calorie-estimation";
import { isCardioExercise, isMeasurementOptionalExercise } from "@/lib/exercise-metadata";
import { usesIntervalLanguage } from "@/lib/log-set-language";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { getExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { buildCurrentSessionHeaderInfoRailItems } from "@/lib/header-info-rail";
import { splitSessionHeaderTitle } from "@/lib/header-meta";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { SESSION_CACHE_SCHEMA_VERSION, type SessionCacheSnapshot } from "@/lib/offline/session-cache";
import {
  buildProgressionHistorySessions,
  validateProgressionPlaybookSelection,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { deriveProgressionProgressPercent } from "@/lib/progression-progress-percent";
import { inferProgressionStepPolicy } from "@/lib/progression-step-policy";
import { buildSessionProgressionFeedbackSummaryLabel } from "@/lib/session-feedback-ui";
import { deriveSessionProgressionSelectedMetrics, getSessionVisiblePromotionStepFieldIds } from "@/lib/session-progression-display";
import { deriveSessionTargetHint } from "@/lib/session-target-hints";
import type { SessionQuickLogTarget } from "@/lib/session-quick-log";
import type { DisplayTarget } from "@/lib/session-targets";
import { generateSetFlowTargets, type PlannedSetTarget } from "@/lib/set-flow-targets";
import { isFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import {
  addSetAction,
  removeExerciseAction,
  deleteSetAction,
  saveSessionAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
  updateSessionExerciseCopilotFeedbackAction,
  updateSessionExerciseProgressionAction,
  updateSessionExerciseTimerAction,
} from "./actions";
import { getSessionPageDataForUser } from "./queries";
import { isSafeAppPath } from "@/lib/navigation-return";

function buildSessionExerciseTarget(exercise: {
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
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
  target_distance_unit?: FitnessDistanceUnit | null;
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

  const prefillReps = target.repsMax ?? target.repsMin;
  if (prefillReps !== undefined) {
    prefill.reps = prefillReps;
  }

  if (target.durationSeconds !== undefined) {
    prefill.durationSeconds = target.durationSeconds;
  }

  return Object.keys(prefill).length > 0 ? prefill : undefined;
}

function optionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toSetFlowQuickLogTarget(args: {
  target: PlannedSetTarget;
  plan: ProgressionTargetPlan;
  fallbackWeightUnit: "lbs" | "kg";
  fallbackDistanceUnit: FitnessDistanceUnit | null;
}): SessionQuickLogTarget {
  const { target, plan, fallbackWeightUnit, fallbackDistanceUnit } = args;
  const targetWeight = optionalNumber(target.targetWeight);
  const targetDistance = optionalNumber(target.distance);

  return {
    measurementType: plan.measurementType,
    repsMin: optionalNumber(target.targetRepsMin),
    repsMax: optionalNumber(target.targetRepsMax),
    weightMin: targetWeight,
    weightMax: targetWeight,
    weightUnit: plan.weightUnit ?? fallbackWeightUnit,
    durationSeconds: optionalNumber(target.durationSeconds),
    distance: targetDistance,
    distanceUnit: targetDistance !== undefined ? (plan.distanceUnit ?? fallbackDistanceUnit ?? undefined) : undefined,
    calories: optionalNumber(target.calories),
  };
}

function resolveSessionExerciseDefaultDistanceUnit(defaultUnit: string | null | undefined): FitnessDistanceUnit | null {
  if (isFitnessDistanceUnit(defaultUnit)) {
    return defaultUnit;
  }

  if (defaultUnit === "miles") {
    return "mi";
  }

  if (defaultUnit === "meters") {
    return "m";
  }

  return null;
}

function buildSessionCalorieEstimationExercise(args: {
  exercise: {
    exercise_name?: string | null;
    measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
    default_unit?: string | null;
  };
  canonicalExercise?: {
    name?: string | null;
    slug?: string | null;
    equipment?: string | null;
    movement_pattern?: string | null;
    measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
    default_unit?: string | null;
    calories_estimation_method?: string | null;
  } | null;
}): CalorieEstimationExerciseInput {
  const canonicalExercise = args.canonicalExercise ?? null;
  return {
    name: args.exercise.exercise_name ?? canonicalExercise?.name ?? null,
    slug: canonicalExercise?.slug ?? null,
    equipment: canonicalExercise?.equipment ?? null,
    movementPattern: canonicalExercise?.movement_pattern ?? null,
    measurementType: args.exercise.measurement_type ?? canonicalExercise?.measurement_type ?? null,
    defaultUnit: args.exercise.default_unit ?? canonicalExercise?.default_unit ?? null,
    caloriesEstimationMethod: canonicalExercise?.calories_estimation_method ?? null,
  };
}

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    exerciseId?: string;
    offlineSnapshot?: string;
    returnTo?: string;
  };
};

export default async function SessionPage({ params, searchParams }: PageProps) {
  const diagnostics = new LoadingDiagnosticsCollector(`/session/${params.id}`);
  const user = await requireUser({
    gate: "session.auth.session",
    route: `/session/${params.id}`,
    blockingReason: "Waiting for authenticated session before opening the session log.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const requestedReturnTo = isSafeAppPath(searchParams?.returnTo) ? searchParams?.returnTo : undefined;
  const forceOfflineSnapshot = process.env.NODE_ENV !== "production" && searchParams?.offlineSnapshot === "1";

  let fetchFailed = false;
  let sessionData: Awaited<ReturnType<typeof getSessionPageDataForUser>> | null = null;

  try {
    sessionData = await getSessionPageDataForUser(params.id, user.id, { diagnostics });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    fetchFailed = true;
    console.error("[session/offline] failed to load live session route", {
      sessionId: params.id,
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (fetchFailed || !sessionData) {
    return (
      <AppShell topNavMode="none" ambientPreset="today">
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <SessionOfflineShell
          userId={user.id}
          sessionId={params.id}
          backHref={requestedReturnTo ?? "/today"}
        />
      </AppShell>
    );
  }

  const {
    sessionRow,
    routine,
    sessionExercises,
    routineDays,
    setsByExercise,
    sessionTargets,
    exerciseOptions,
    exerciseNameMap,
    exerciseStatsByExerciseId,
    progressionHistoryByExerciseId,
    progressionHistoryByRoutineDayExerciseId,
  } = sessionData;

  const unitLabel = routine?.weight_unit ?? "kg";
  const exerciseById = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise]));

  const mergedSessionLabel = splitSessionHeaderTitle(sessionRow.name);
  const routineName = routine?.name
    ?? mergedSessionLabel?.title
    ?? "Routine";
  const sessionDayName = mergedSessionLabel?.subtitle
    ?? (sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day"));
  const sessionSummaryCounts = getExerciseCountSummaryFromInputs(
    sessionExercises.map((exercise) => {
      const canonicalExercise = exerciseById.get(exercise.exercise_id);
      return {
        // Keep this aligned with the shared ExerciseRow contract returned by listExercises().
        // Taxonomy-aware summary helpers should consume canonical contract fields first,
        // rather than screen-local assumptions about extra exercise columns.
        measurement_type: exercise.measurement_type ?? canonicalExercise?.measurement_type ?? null,
        equipment: canonicalExercise?.equipment ?? null,
        movement_pattern: canonicalExercise?.movement_pattern ?? null,
        primary_muscle: canonicalExercise?.primary_muscle ?? null,
        isCardio: canonicalExercise ? isCardioExercise(canonicalExercise) : null,
        kind: null,
        type: null,
        tags: null,
        categories: null,
      };
    }),
  );
  const routineTrainingDays = routineDays.filter((day) => !day.is_rest).length;
  const routineRestDays = routineDays.filter((day) => Boolean(day.is_rest)).length;
  const routineCycleLengthDays = routineDays.length;
  const sessionIsRestDay = routineDays.find((day) => day.day_index === sessionRow.routine_day_index)?.is_rest ?? false;
  const requestedExerciseId = typeof searchParams?.exerciseId === "string"
    && sessionExercises.some((exercise) => exercise.id === searchParams.exerciseId)
    ? searchParams.exerciseId
    : null;
  const sessionExerciseItems = sessionExercises.map((exercise) => {
    const displayTarget = buildSessionExerciseTarget(exercise) ?? sessionTargets.get(exercise.id);
    const canonicalExercise = exerciseById.get(exercise.exercise_id);
    const calorieEstimationExercise = buildSessionCalorieEstimationExercise({
      exercise,
      canonicalExercise,
    });
    const resolvedCaloriesEstimationMethod = resolveCaloriesEstimationMethod(calorieEstimationExercise);
    const exerciseMetadata = {
      name: exercise.exercise_name ?? canonicalExercise?.name ?? null,
      measurement_type: exercise.measurement_type ?? canonicalExercise?.measurement_type ?? null,
      equipment: canonicalExercise?.equipment ?? null,
      movement_pattern: canonicalExercise?.movement_pattern ?? null,
      primary_muscle: canonicalExercise?.primary_muscle ?? null,
    };
    const isCardio = isCardioExercise(exerciseMetadata);
    const isMeasurementOptional = isMeasurementOptionalExercise(exerciseMetadata);
    const useIntervalLanguage = usesIntervalLanguage({
      intervalMode: false,
    });
    const exerciseStats = exerciseStatsByExerciseId.get(exercise.exercise_id) ?? null;
    const routineDayProgressionRows = exercise.routine_day_exercise_id
      ? (progressionHistoryByRoutineDayExerciseId.get(exercise.routine_day_exercise_id) ?? [])
      : [];
    const progressionRows = routineDayProgressionRows.length > 0
      ? routineDayProgressionRows
      : (progressionHistoryByExerciseId.get(exercise.exercise_id) ?? []);
    const progressionHistory = buildProgressionHistorySessions({
      rows: progressionRows,
      targetSetCount: displayTarget?.setsMin ?? displayTarget?.setsMax ?? null,
      topRepTarget: displayTarget?.repsMax ?? displayTarget?.repsMin ?? null,
      limit: 6,
    });
    const progressionPlan = displayTarget ? {
      measurementType: displayTarget.measurementType ?? "reps",
      setsMin: displayTarget.setsMin ?? null,
      setsMax: displayTarget.setsMax ?? null,
      repsTarget: exercise.target_reps ?? displayTarget.repsMax ?? displayTarget.repsMin ?? null,
      repsMin: exercise.target_reps_min ?? displayTarget.repsMin ?? null,
      repsMax: exercise.target_reps_max ?? displayTarget.repsMax ?? null,
      weightMin: displayTarget.weightMin ?? null,
      weightMax: displayTarget.weightMax ?? null,
      weightUnit: displayTarget.weightUnit ?? unitLabel,
      durationSeconds: displayTarget.durationSeconds ?? null,
      distance: displayTarget.distance ?? null,
      distanceUnit: displayTarget.distanceUnit ?? null,
      calories: displayTarget.calories ?? null,
    } : null;
    const resolvedProgressionPlan = progressionPlan
      ? withEstimatedCaloriesForTarget({
          target: progressionPlan,
          exercise: calorieEstimationExercise,
          method: resolvedCaloriesEstimationMethod,
        })
      : null;
    const progressionSelection = exercise.progression_playbook_id
      ? validateProgressionPlaybookSelection({
          playbookId: exercise.progression_playbook_id,
          config: exercise.progression_playbook_config ?? null,
        })
      : null;
    const targetHint = deriveSessionTargetHint({
      measurementType: (isMeasurementOptional ? "none" : (exercise.measurement_type ?? canonicalExercise?.measurement_type ?? "reps")) ?? "reps",
      fallbackWeightUnit: unitLabel,
      stats: exerciseStats,
      plan: resolvedProgressionPlan,
      playbook: progressionSelection ? {
        playbookId: progressionSelection.id,
        config: progressionSelection.config,
        history: progressionHistory,
      } : null,
    });
    const progressionStepPolicy = progressionSelection && resolvedProgressionPlan
      ? inferProgressionStepPolicy({
          measurementType: resolvedProgressionPlan.measurementType,
          equipment: canonicalExercise?.equipment ?? null,
          movementPattern: canonicalExercise?.movement_pattern ?? null,
          defaultUnit: exercise.default_unit ?? canonicalExercise?.default_unit ?? null,
          weightUnit: resolvedProgressionPlan.weightUnit ?? unitLabel,
          distanceUnit: resolvedProgressionPlan.distanceUnit === "km" ? "km" : "mi",
          targetWeight: resolvedProgressionPlan.weightMax ?? resolvedProgressionPlan.weightMin ?? null,
          exerciseOverrideValue: progressionSelection.config.loadIncrement,
          stepOverrides: progressionSelection.config.stepOverrides ?? null,
        })
      : null;
    const progressionMeasurementSelections = deriveSessionProgressionSelectedMetrics({
      measurementType: resolvedProgressionPlan?.measurementType ?? null,
      repsTarget: resolvedProgressionPlan?.repsTarget ?? null,
      repsMin: resolvedProgressionPlan?.repsMin ?? null,
      repsMax: resolvedProgressionPlan?.repsMax ?? null,
      weightMin: resolvedProgressionPlan?.weightMin ?? null,
      weightMax: resolvedProgressionPlan?.weightMax ?? null,
      durationSeconds: resolvedProgressionPlan?.durationSeconds ?? null,
      distance: resolvedProgressionPlan?.distance ?? null,
      calories: resolvedProgressionPlan?.calories ?? null,
    });
    const setFlowQuickLogTargets = progressionSelection && resolvedProgressionPlan
      ? generateSetFlowTargets({
          setFlow: progressionSelection.config.setFlow,
          setFlowDirections: progressionSelection.config.setFlowDirections ?? null,
          plan: resolvedProgressionPlan,
          progressionStepPolicy,
          setFlowSteps: progressionSelection.config.setFlowSteps ?? null,
        }).map((target) => withEstimatedCaloriesForTarget({
          target: toSetFlowQuickLogTarget({
            target,
            plan: resolvedProgressionPlan,
            fallbackWeightUnit: unitLabel,
            fallbackDistanceUnit: resolveSessionExerciseDefaultDistanceUnit(exercise.default_unit),
          }),
          exercise: calorieEstimationExercise,
          method: resolvedCaloriesEstimationMethod,
        }))
      : [];
    const resolvedQuickLogTarget = displayTarget
      ? withEstimatedCaloriesForTarget({
          target: {
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
          },
          exercise: calorieEstimationExercise,
          method: resolvedCaloriesEstimationMethod,
        })
      : undefined;
    const goalLabel = formatExerciseGoalSummary({
      sets: displayTarget?.setsMin ?? displayTarget?.setsMax ?? null,
      reps: resolveExerciseGoalCurrentReps({
        target_reps: exercise.target_reps ?? null,
        target_reps_min: displayTarget?.repsMin ?? null,
        target_reps_max: displayTarget?.repsMax ?? null,
      }),
      repsMax: resolveExerciseGoalCurrentReps({
        target_reps: exercise.target_reps ?? null,
        target_reps_min: displayTarget?.repsMin ?? null,
        target_reps_max: displayTarget?.repsMax ?? null,
      }),
      weight: displayTarget?.weightMin ?? displayTarget?.weightMax ?? null,
      weightUnit: displayTarget?.weightUnit ?? unitLabel,
      durationSeconds: displayTarget?.durationSeconds ?? null,
      distance: displayTarget?.distance ?? null,
      distanceUnit: displayTarget?.distanceUnit ?? null,
      calories: displayTarget?.calories ?? null,
      emptyLabel: "Goal missing",
    });
    const progressionFormState = createProgressionPlaybookFormState({
      playbookId: exercise.progression_playbook_id ?? null,
      config: exercise.progression_playbook_config ?? null,
    });

    return {
      id: exercise.id,
      exerciseId: exercise.exercise_id,
      name: normalizeExerciseDisplayName({
        exerciseId: exercise.exercise_id,
        name: exercise.exercise_name ?? null,
        fallbackName: exerciseNameMap.get(exercise.exercise_id) ?? canonicalExercise?.name ?? null,
      }),
      isSkipped: exercise.is_skipped,
      defaultUnit: resolveSessionExerciseDefaultDistanceUnit(exercise.default_unit),
      isCardio,
      measurementType: isMeasurementOptional ? "none" : (exercise.measurement_type ?? canonicalExercise?.measurement_type ?? null),
      primary_muscle: canonicalExercise?.primary_muscle ?? null,
      equipment: canonicalExercise?.equipment ?? null,
      movement_pattern: canonicalExercise?.movement_pattern ?? null,
      image_path: canonicalExercise?.image_path ?? null,
      image_icon_path: canonicalExercise?.image_icon_path ?? null,
      useIntervalLanguage,
      routineDayExerciseId: exercise.routine_day_exercise_id ?? null,
      image_howto_path: canonicalExercise?.image_howto_path ?? null,
      slug: canonicalExercise?.slug ?? null,
      caloriesEstimationMethod: canonicalExercise?.calories_estimation_method ?? null,
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
        if (isMeasurementOptional) {
          return { reps: false, weight: false, time: false, distance: false, calories: false };
        }

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
      goalLabel,
      prefill: getGoalPrefill(displayTarget, unitLabel),
      setFlowQuickLogTargets,
      quickLogTarget: isMeasurementOptional
        ? {
            repsMin: resolvedQuickLogTarget?.repsMin,
            repsMax: resolvedQuickLogTarget?.repsMax,
            weightMin: resolvedQuickLogTarget?.weightMin,
            weightMax: resolvedQuickLogTarget?.weightMax,
            weightUnit: resolvedQuickLogTarget?.weightUnit,
            durationSeconds: resolvedQuickLogTarget?.durationSeconds,
            distance: resolvedQuickLogTarget?.distance,
            distanceUnit: resolvedQuickLogTarget?.distanceUnit,
            calories: resolvedQuickLogTarget?.calories,
            measurementType: displayTarget?.measurementType ?? "none",
            allowMeasurementlessLog: true,
          }
        : (
          resolvedQuickLogTarget
        ),
      targetHint,
      progressionFormState,
      progressionStepPolicy,
      visiblePromotionStepFields: getSessionVisiblePromotionStepFieldIds({
        progressionStepPolicy,
        selectedMetrics: progressionMeasurementSelections,
      }),
      progressionSelectedMetrics: [...progressionMeasurementSelections],
      progressFill: deriveProgressionProgressPercent({
        plan: resolvedProgressionPlan,
        historyRows: progressionRows,
      }),
      progressionStateLabel: buildSessionProgressionFeedbackSummaryLabel({
        progressionFormState: {
          progressionPlaybookId: progressionFormState.progressionPlaybookId,
          progressionSessionSettingsEnabled: progressionFormState.progressionSessionSettingsEnabled,
          progressionSetSettingsEnabled: progressionFormState.progressionSetSettingsEnabled,
        },
        copilotFeedbackSignal: exercise.copilot_feedback_signal ?? null,
      }),
      copilotFeedbackSignal: exercise.copilot_feedback_signal ?? null,
      copilotFeedbackNote: exercise.copilot_feedback_note ?? null,
      copilotFeedbackEffort: exercise.copilot_feedback_effort ?? null,
      copilotFeedbackUpdatedAt: exercise.copilot_feedback_updated_at ?? null,
      targetSetsMin: displayTarget?.setsMin ?? null,
      targetSetsMax: displayTarget?.setsMax ?? null,
      initialSets: setsByExercise.get(exercise.id) ?? [],
      loggedSetCount: (setsByExercise.get(exercise.id) ?? []).length,
      exerciseTimer: {
        enabled: exercise.exercise_timer_enabled === true,
        mode: exercise.exercise_timer_mode ?? null,
        targetSeconds: exercise.exercise_timer_target_seconds ?? null,
        elapsedSeconds: exercise.exercise_timer_elapsed_seconds ?? 0,
        status: exercise.exercise_timer_status ?? "idle",
        startedAt: exercise.exercise_timer_started_at ?? null,
        completedAt: exercise.exercise_timer_completed_at ?? null,
      },
    };
  });
  const sessionHeaderInfoItems = buildCurrentSessionHeaderInfoRailItems({
    isCompleted: sessionRow.status === "completed",
    sessionDayIndex: sessionRow.routine_day_index ?? null,
    cycleLengthDays: routineCycleLengthDays,
    isRestDay: sessionIsRestDay,
    trainingDays: routineTrainingDays,
    restDays: routineRestDays,
    sessionExerciseCount: sessionExerciseItems.length,
    loggedExerciseCount: sessionExerciseItems.filter((exercise) => exercise.loggedSetCount > 0).length,
    skippedExerciseCount: sessionExerciseItems.filter((exercise) => exercise.isSkipped).length,
    splitSummary: {
      total: sessionExerciseItems.length,
      strength: sessionSummaryCounts.strength,
      cardio: sessionSummaryCounts.cardio,
      bodyweight: sessionSummaryCounts.bodyweight,
      unknown: sessionSummaryCounts.unknown,
    },
  });
  const sessionSnapshot: SessionCacheSnapshot = {
    schemaVersion: SESSION_CACHE_SCHEMA_VERSION,
    userId: user.id,
    sessionId: params.id,
    capturedAt: new Date().toISOString(),
    routineName,
    sessionDayName,
    headerInfoItems: sessionHeaderInfoItems,
    exercises: sessionExerciseItems.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      targets: exercise.goalLabel,
      primary_muscle: exercise.primary_muscle,
      equipment: exercise.equipment,
      movement_pattern: exercise.movement_pattern,
      measurement_type: exercise.measurementType,
      image_path: exercise.image_path,
      image_icon_path: exercise.image_icon_path,
      image_howto_path: exercise.image_howto_path,
      slug: exercise.slug,
      loggedSetCount: exercise.loggedSetCount,
      isSkipped: exercise.isSkipped,
      targetSetsMin: exercise.targetSetsMin,
      targetSetsMax: exercise.targetSetsMax,
      progressionStateLabel: exercise.progressionStateLabel,
      defaultUnit: exercise.defaultUnit ?? null,
    })),
  };

  if (forceOfflineSnapshot) {
    return (
      <AppShell topNavMode="none" ambientPreset="today">
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <SessionOfflineShell
          userId={user.id}
          sessionId={params.id}
          backHref={requestedReturnTo ?? "/today"}
          initialSnapshot={sessionSnapshot}
        />
      </AppShell>
    );
  }

  return (
    <AppShell topNavMode="none" ambientPreset="today">
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <SessionPageClient
          userId={sessionRow.user_id}
          sessionId={params.id}
          initialDurationSeconds={sessionRow.duration_seconds}
          initialIsSessionCompleted={sessionRow.status === "completed"}
          performedAt={sessionRow.performed_at}
          routineName={routineName}
          sessionDayName={sessionDayName}
          sessionSummaryCounts={sessionSummaryCounts}
          routineTrainingDays={routineTrainingDays}
          routineRestDays={routineRestDays}
          routineCycleLengthDays={routineCycleLengthDays}
          sessionDayIndex={sessionRow.routine_day_index ?? null}
          sessionIsRestDay={sessionIsRestDay}
          searchError={searchParams?.error}
          unitLabel={unitLabel}
          exercises={sessionExerciseItems}
          saveSessionAction={saveSessionAction}
          requestedReturnTo={requestedReturnTo}
          initialSelectedExerciseId={requestedExerciseId}
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
          updateSessionExerciseCopilotFeedbackAction={updateSessionExerciseCopilotFeedbackAction}
          updateSessionExerciseProgressionAction={updateSessionExerciseProgressionAction}
          updateSessionExerciseTimerAction={updateSessionExerciseTimerAction}
        />
        <SessionOfflineBridge snapshot={sessionSnapshot} />
    </AppShell>
  );
}
