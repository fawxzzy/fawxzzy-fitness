import { notFound } from "next/navigation";
import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { getExerciseNameMap } from "@/lib/exercises";
import { requireUser } from "@/lib/auth";
import { EMPTY_PR_COUNTS, evaluatePrSummaries, type PrEvaluationSet } from "@/lib/pr-evaluator";
import {
  getHistoryPreviewDetailPageData,
} from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfile } from "@/lib/profile";
import {
  hasQaLlelMarker,
  QA_LLEL_VISIBILITY_COOKIE,
  resolveQaLlelVisibilityOverride,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  buildExerciseProgressionLifelineSummary,
  buildSessionProgressionSummary,
} from "@/lib/progression-lifeline-summary";
import {
  validateProgressionPlaybookSelection,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { inferProgressionStepPolicy } from "@/lib/progression-step-policy";
import { buildPlannedSetTargetSeriesSummary } from "@/lib/session-recap-target-series";
import { generateSetFlowTargets } from "@/lib/set-flow-targets";
import { buildWorkoutRecapArtifact } from "@/lib/workout-recap";
import { isFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ProgressionEventRow, RoutineDayExerciseRow, SessionExerciseRow, SessionRow, SetRow } from "@/types/db";
import { HistoryLogPageClient } from "./HistoryLogPageClient";
import { buildSessionSummary } from "../session-summary";
import { loadHistoryDetailRows, resolveHistoryExerciseName } from "@/lib/history-session-detail-loader";
import { HistoryRouteErrorShell } from "@/components/history/HistoryShared";

export const dynamic = "force-dynamic";
type PageProps = {
  params: { sessionId: string };
};

function toClientPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type HistoryRoutineDayExerciseRelation = Partial<RoutineDayExerciseRow> | Array<Partial<RoutineDayExerciseRow>> | null | undefined;

function resolveRoutineDayExerciseRelation(row: { routine_day_exercise?: HistoryRoutineDayExerciseRelation }) {
  const relation = row.routine_day_exercise;
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function firstDefined<T>(...values: Array<T | null | undefined>) {
  return values.find((value): value is T => value !== null && value !== undefined);
}

function normalizeWeightUnit(value: unknown, fallback: "lbs" | "kg"): "lbs" | "kg" {
  return value === "lbs" || value === "kg" ? value : fallback;
}

function normalizeDistanceUnit(value: unknown, fallback?: FitnessDistanceUnit | null): FitnessDistanceUnit | null {
  if (isFitnessDistanceUnit(value)) return value;
  return fallback ?? null;
}

function buildHistoryProgressionPlan(args: {
  sessionExercise: SessionExerciseRow;
  routineExercise: Partial<RoutineDayExerciseRow> | null;
  measurementType: ProgressionTargetPlan["measurementType"];
  fallbackWeightUnit: "lbs" | "kg";
  fallbackDistanceUnit: FitnessDistanceUnit | null;
}) {
  const sessionExercise = args.sessionExercise;
  const routineExercise = args.routineExercise;
  const setsMin = firstDefined(sessionExercise.target_sets_min, routineExercise?.target_sets);
  const setsMax = firstDefined(sessionExercise.target_sets_max, routineExercise?.target_sets);
  const repsMin = firstDefined(sessionExercise.target_reps_min, routineExercise?.target_reps_min, routineExercise?.target_reps);
  const repsMax = firstDefined(sessionExercise.target_reps_max, routineExercise?.target_reps_max, routineExercise?.target_reps);
  const weightMin = firstDefined(sessionExercise.target_weight_min, routineExercise?.target_weight);
  const weightMax = firstDefined(sessionExercise.target_weight_max, routineExercise?.target_weight);
  const durationSeconds = firstDefined(
    sessionExercise.target_time_seconds_min,
    sessionExercise.target_time_seconds_max,
    routineExercise?.target_duration_seconds,
  );
  const distance = firstDefined(sessionExercise.target_distance_min, sessionExercise.target_distance_max, routineExercise?.target_distance);
  const calories = firstDefined(sessionExercise.target_calories_min, sessionExercise.target_calories_max, routineExercise?.target_calories);

  const hasTarget = [
    setsMin,
    setsMax,
    repsMin,
    repsMax,
    weightMin,
    weightMax,
    durationSeconds,
    distance,
    calories,
  ].some((value) => value !== null && value !== undefined);

  if (!hasTarget) {
    return null;
  }

  return {
    measurementType: args.measurementType,
    setsMin: setsMin ?? null,
    setsMax: setsMax ?? null,
    repsTarget: firstDefined(repsMax, repsMin) ?? null,
    repsMin: repsMin ?? null,
    repsMax: repsMax ?? null,
    weightMin: weightMin ?? null,
    weightMax: weightMax ?? null,
    weightUnit: normalizeWeightUnit(firstDefined(sessionExercise.target_weight_unit, routineExercise?.target_weight_unit), args.fallbackWeightUnit),
    durationSeconds: durationSeconds ?? null,
    distance: distance ?? null,
    distanceUnit: normalizeDistanceUnit(
      firstDefined(sessionExercise.target_distance_unit, routineExercise?.target_distance_unit),
      args.fallbackDistanceUnit,
    ),
    calories: calories ?? null,
  } satisfies ProgressionTargetPlan;
}

function buildHistoryExerciseTargetSeriesSummary(args: {
  sessionExercise: SessionExerciseRow;
  routineExercise: Partial<RoutineDayExerciseRow> | null;
  metadata: {
    measurement_type?: ProgressionTargetPlan["measurementType"] | null;
    default_unit?: string | null;
    equipment?: string | null;
    movement_pattern?: string | null;
  } | null | undefined;
  fallbackWeightUnit: "lbs" | "kg";
}) {
  const selection = args.routineExercise?.progression_playbook_id
    ? validateProgressionPlaybookSelection({
        playbookId: args.routineExercise.progression_playbook_id,
        config: args.routineExercise.progression_playbook_config ?? null,
      })
    : null;

  if (!selection) {
    return null;
  }

  const measurementType = (
    args.sessionExercise.measurement_type
      ?? args.routineExercise?.measurement_type
      ?? args.metadata?.measurement_type
      ?? "reps"
  ) as ProgressionTargetPlan["measurementType"];
  const fallbackDistanceUnit = normalizeDistanceUnit(args.sessionExercise.default_unit, normalizeDistanceUnit(args.metadata?.default_unit, "mi"));
  const plan = buildHistoryProgressionPlan({
    sessionExercise: args.sessionExercise,
    routineExercise: args.routineExercise,
    measurementType,
    fallbackWeightUnit: args.fallbackWeightUnit,
    fallbackDistanceUnit,
  });

  if (!plan) {
    return null;
  }

  const progressionStepPolicy = inferProgressionStepPolicy({
    measurementType: plan.measurementType,
    equipment: args.metadata?.equipment ?? null,
    movementPattern: args.metadata?.movement_pattern ?? null,
    defaultUnit: args.sessionExercise.default_unit ?? args.routineExercise?.default_unit ?? args.metadata?.default_unit ?? null,
    weightUnit: plan.weightUnit ?? args.fallbackWeightUnit,
    distanceUnit: plan.distanceUnit ?? fallbackDistanceUnit ?? "mi",
    targetWeight: plan.weightMax ?? plan.weightMin ?? null,
    exerciseOverrideValue: selection.config.loadIncrement,
    stepOverrides: selection.config.stepOverrides ?? null,
  });
  const targets = generateSetFlowTargets({
    setFlow: selection.config.setFlow,
    setFlowDirections: selection.config.setFlowDirections ?? null,
    setFlowSteps: selection.config.setFlowSteps ?? null,
    plan,
    progressionStepPolicy,
  });

  return buildPlannedSetTargetSeriesSummary({
    targets,
    weightUnit: plan.weightUnit ?? args.fallbackWeightUnit,
    distanceUnit: plan.distanceUnit ?? fallbackDistanceUnit,
  });
}

export default async function HistoryLogDetailsPage({ params }: PageProps) {
  const diagnostics = new LoadingDiagnosticsCollector(`/history/${params.sessionId}`);
  try {
    if (isHistoryPreviewActiveForRequest()) {
      const previewData = getHistoryPreviewDetailPageData(params.sessionId);
      if (!previewData) {
        notFound();
      }

      return (
        <HistoryRouteScaffold mode="detail" showTopChrome={false} floatingHeader={<div id="history-log-floating-header" />}>
          <HistoryLogPageClient
            logId={previewData.sessionSummary.id}
            initialDayName={previewData.initialDayName}
            initialNotes={previewData.initialNotes}
            unitLabel={previewData.unitLabel}
            exerciseNameMap={previewData.exerciseNameMap}
            sessionSummary={previewData.sessionSummary}
            backHref={previewData.backHref}
            exercises={previewData.exercises}
          />
        </HistoryRouteScaffold>
      );
    }

    const user = await requireUser({
      gate: "history.detail.auth.session",
      route: `/history/${params.sessionId}`,
      blockingReason: "Waiting for authenticated session before loading history detail.",
      timeoutMs: 5000,
      collector: diagnostics,
    });
    const supabase = supabaseServer();
    const profilePromise = ensureProfile(user.id);
    const exerciseNameMapPromise = diagnostics.measure("history.detail.exercise-names.fetch", () => getExerciseNameMap(), {
      blockingReason: "Waiting for exercise names for history detail.",
      metadata: {
        sessionId: params.sessionId,
        userId: user.id,
      },
      timeoutMs: 7000,
    });
    const sessionResultPromise = diagnostics.measure<{ data: unknown }>("history.detail.session.fetch", async () => await supabase
      .from("sessions")
      .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status, routines(name, weight_unit)")
      .eq("id", params.sessionId)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .single(), {
      blockingReason: "Waiting for the completed history session record.",
      metadata: {
        sessionId: params.sessionId,
        userId: user.id,
      },
      timeoutMs: 7000,
    });
    const [profile, sessionResult] = await Promise.all([profilePromise, sessionResultPromise]);
    const showQaLlelData = resolveShowQaLlelDataPreferenceWithOverride(
      profile,
      resolveQaLlelVisibilityOverride(cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value),
    );

    const session = sessionResult.data as SessionRow & {
      routines?: Array<{ name: string; weight_unit: "lbs" | "kg" | null }> | { name: string; weight_unit: "lbs" | "kg" | null } | null;
    } | null;

    if (!session) {
      notFound();
    }

    const routineField = session.routines;
    const routineName = Array.isArray(routineField)
      ? routineField[0]?.name ?? session.name ?? null
      : routineField?.name ?? session.name ?? null;

    if (!showQaLlelData && hasQaLlelMarker([
      routineName,
      session.day_name_override,
      session.routine_day_name,
      session.name,
      session.notes,
    ])) {
      notFound();
    }

    const sessionRow = session;

    const historyDetailRowsPromise = diagnostics.measure("history.detail.rows.fetch", () => loadHistoryDetailRows({
      supabase,
      sessionId: sessionRow.id,
      userId: user.id,
      sessionFound: true,
    }), {
      blockingReason: "Waiting for logged session exercises and sets.",
      metadata: {
        sessionId: params.sessionId,
        userId: user.id,
      },
      timeoutMs: 7000,
    });
    const routineDayPromise = sessionRow.routine_id && typeof sessionRow.routine_day_index === "number"
      ? supabase
        .from("routine_days")
        .select("name")
        .eq("routine_id", sessionRow.routine_id)
        .eq("day_index", sessionRow.routine_day_index)
        .eq("user_id", user.id)
        .maybeSingle()
      : Promise.resolve({ data: null });

    const [{
      orderedSessionExercises,
      exerciseMetadataById,
      sessionExerciseIds,
      sets,
      summary: loaderSummary,
    }, { data: routineDay }, exerciseNameMap] = await Promise.all([
      historyDetailRowsPromise,
      routineDayPromise,
      exerciseNameMapPromise,
    ]);

    if (process.env.NODE_ENV !== "production") {
      console.info("[history-detail-loader]", loaderSummary);
    }

    const setsByExercise = new Map<string, SetRow[]>();

    for (const set of sets) {
      const current = setsByExercise.get(set.session_exercise_id) ?? [];
      current.push(set);
      setsByExercise.set(set.session_exercise_id, current);
    }

    const exerciseNameRecord = Object.fromEntries(exerciseNameMap.entries());
    const routineTitle = routineName ?? "Session";
    const unitLabel = Array.isArray(routineField)
      ? routineField[0]?.weight_unit ?? "kg"
      : routineField?.weight_unit ?? "kg";
    const effectiveDayName = sessionRow.day_name_override
      ?? routineDay?.name
      ?? sessionRow.routine_day_name
      ?? (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day");
    const backHref = `/history?tab=sessions&selected=${sessionRow.id}`;

    const exerciseIds = orderedSessionExercises.map((exercise) => exercise.exercise_id);
    const [{ data: historicalSetRows }, { data: progressionEventRows }] = exerciseIds.length
      ? await diagnostics.measure("history.detail.analytics.fetch", () => Promise.all([
          supabase
            .from("sets")
            .select("set_index, weight, reps, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
            .eq("user_id", user.id)
            .eq("session_exercise.user_id", user.id)
            .eq("session_exercise.session.status", "completed")
            .in("session_exercise.exercise_id", exerciseIds),
          supabase
            .from("progression_events")
            .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
            .eq("user_id", user.id)
            .in("exercise_id", exerciseIds),
        ]), {
          blockingReason: "Waiting for session PR and progression analytics.",
          metadata: {
            sessionId: params.sessionId,
            userId: user.id,
            exerciseCount: exerciseIds.length,
          },
          timeoutMs: 7000,
        })
      : [{ data: [] }, { data: [] }];

    const prEvaluationSets: PrEvaluationSet[] = ((historicalSetRows ?? []) as Array<{
      set_index: number;
      weight: number | null;
      reps: number | null;
      session_exercise:
        | {
          session_id: string;
          exercise_id: string;
          session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
        }
        | Array<{
          session_id: string;
          exercise_id: string;
          session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
        }>
        | null;
    }>).flatMap((row) => {
      const sessionExercise = Array.isArray(row.session_exercise)
        ? (row.session_exercise[0] ?? null)
        : (row.session_exercise ?? null);
      const session = Array.isArray(sessionExercise?.session)
        ? (sessionExercise?.session[0] ?? null)
        : (sessionExercise?.session ?? null);
      if (!sessionExercise?.exercise_id || !sessionExercise?.session_id || !session?.performed_at || session.status !== "completed") {
        return [];
      }

      return [{
        exerciseId: sessionExercise.exercise_id,
        sessionId: sessionExercise.session_id,
        performedAt: session.performed_at,
        setIndex: row.set_index,
        weight: row.weight,
        reps: row.reps,
      }];
    });
    const { sessionCountsById, sessionPrExerciseIdsById } = evaluatePrSummaries(prEvaluationSets);
    const progressionEvents = (progressionEventRows ?? []) as ProgressionEventRow[];
    const progressionEventsByExerciseId = new Map<string, ProgressionEventRow[]>();
    for (const event of progressionEvents) {
      const current = progressionEventsByExerciseId.get(event.exercise_id) ?? [];
      current.push(event);
      progressionEventsByExerciseId.set(event.exercise_id, current);
    }

    const sessionSummaryBase = buildSessionSummary({
      sessionRow,
      routineTitle,
      dayTitle: effectiveDayName,
      sessionExercises: orderedSessionExercises.map((exercise) => ({
        id: exercise.id,
        session_id: exercise.session_id,
        exercise_id: exercise.exercise_id,
      })),
      setsBySessionExerciseId: new Map(Array.from(setsByExercise.entries())),
      exerciseNameById: exerciseNameMap,
      prCounts: sessionCountsById.get(sessionRow.id) ?? { ...EMPTY_PR_COUNTS },
      prExerciseNames: Array.from(sessionPrExerciseIdsById.get(sessionRow.id) ?? [])
        .map((exerciseId) => exerciseNameMap.get(exerciseId) ?? "")
        .filter(Boolean),
    });
    const sessionSummary = {
      ...sessionSummaryBase,
      progressionSummary: buildSessionProgressionSummary(
        progressionEvents.filter((event) => event.source_session_id === sessionRow.id),
        exerciseNameMap,
      ),
    };
    const clientExercises = toClientPlainObject(orderedSessionExercises.map((exercise) => {
      const exerciseId = String(exercise.exercise_id);
      const metadata = exerciseMetadataById.get(exerciseId);
      const routineExercise = resolveRoutineDayExerciseRelation(exercise);
      const resolvedExerciseName = resolveHistoryExerciseName({
        metadataName: metadata?.name,
        rowExerciseName: (exercise as { exercise_name?: string | null }).exercise_name,
        rowName: (exercise as { name?: string | null }).name,
        mapExerciseName: exerciseNameRecord[exerciseId] ?? null,
      });
      return ({
        id: exercise.id,
        exercise_id: exerciseId,
        exercise_name: resolvedExerciseName,
        exercise_slug: metadata?.slug ?? null,
        exercise_image_path: metadata?.image_path ?? null,
        exercise_image_icon_path: metadata?.image_icon_path ?? null,
        exercise_image_howto_path: metadata?.image_howto_path ?? null,
        notes: exercise.notes,
        copilot_feedback_note: exercise.copilot_feedback_note ?? null,
        measurement_type: exercise.measurement_type ?? metadata?.measurement_type ?? "reps",
        default_unit: exercise.default_unit ?? metadata?.default_unit ?? null,
        target_sets_min: exercise.target_sets_min ?? null,
        target_sets_max: exercise.target_sets_max ?? null,
        targetSeriesSummary: buildHistoryExerciseTargetSeriesSummary({
          sessionExercise: exercise,
          routineExercise,
          metadata,
          fallbackWeightUnit: unitLabel,
        }),
        progressionSummary: buildExerciseProgressionLifelineSummary(progressionEventsByExerciseId.get(exerciseId) ?? [], {
          exerciseNameById: exerciseNameMap,
          routineTitleById: sessionRow.routine_id ? new Map([[sessionRow.routine_id, routineTitle]]) : undefined,
        }),
        sets: (setsByExercise.get(exercise.id) ?? []).map((set) => ({
          id: set.id,
          set_index: set.set_index,
          weight: set.weight,
          reps: set.reps,
          duration_seconds: set.duration_seconds,
          distance: set.distance,
          distance_unit: set.distance_unit,
          calories: set.calories,
          weight_unit: set.weight_unit,
        })),
      });
    }));
    const clientSessionSummary = toClientPlainObject(sessionSummary);
    const recapArtifact = isFeatureEnabled("shareableRecapArtifacts")
      ? buildWorkoutRecapArtifact({
          sessionSummary: clientSessionSummary,
          exercises: clientExercises.map((exercise) => ({
            id: exercise.id,
            exerciseId: exercise.exercise_id,
            exerciseName: exercise.exercise_name ?? exerciseNameRecord[exercise.exercise_id] ?? "Exercise",
            sets: exercise.sets.map((set) => ({
              weight: set.weight,
              reps: set.reps,
              weightUnit: set.weight_unit,
              durationSeconds: set.duration_seconds,
              distance: set.distance,
              distanceUnit: set.distance_unit,
              calories: set.calories,
            })),
          })),
        })
      : null;

    return (
      <HistoryRouteScaffold mode="detail" showTopChrome={false} floatingHeader={<div id="history-log-floating-header" />}>
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistoryLogPageClient
          logId={sessionRow.id}
          initialDayName={effectiveDayName}
          initialNotes={sessionRow.notes}
          unitLabel={unitLabel}
          exerciseNameMap={exerciseNameRecord}
          sessionSummary={clientSessionSummary}
          recapArtifact={toClientPlainObject(recapArtifact)}
          backHref={backHref}
          exercises={clientExercises}
        />
      </HistoryRouteScaffold>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/detail] failed to load or render log details", {
      sessionId: params.sessionId,
      error,
    });

    return (
      <HistoryRouteScaffold mode="detail" showTopChrome={false} floatingHeader={<div id="history-log-floating-header" />}>
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistoryRouteErrorShell
          title="Unable to load this session right now."
          caption="Please go back to History and try again in a moment."
          backHref="/history?tab=sessions"
          backLabel="Back to History"
        />
      </HistoryRouteScaffold>
    );
  }
}
