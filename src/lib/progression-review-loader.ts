import {
  inferProgressionAuditRejectionReason,
  type ProgressionAuditHistorySource,
} from "@/lib/progression-candidate-audit";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  normalizeProgressionMethodLayerId,
  validateProgressionPlaybookSelection,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { inferProgressionStepPolicy } from "@/lib/progression-step-policy";
import {
  getProgressionEvaluationFingerprint,
  getProgressionTargetFingerprint,
  type ProgressionHistoryScopeTier,
} from "@/lib/progression-history-scope";
import { formatProgressionReviewDisplayItem, type ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import { deriveProgressionProgressPercent } from "@/lib/progression-progress-percent";
import {
  formatProgressionCalculationEvidence,
  formatProgressionStatusDisplayItem,
  type ProgressionStatusDisplayItem,
} from "@/lib/progression-status-display";
import type { supabaseServer } from "@/lib/supabase/server";
import type { FitnessDistanceUnit, RoutineDayExerciseRow } from "@/types/db";

export function buildProgressionReviewTargetPlan(exercise: RoutineDayExerciseRow): ProgressionTargetPlan {
  return {
    measurementType: exercise.measurement_type ?? "reps",
    setsMin: exercise.target_sets ?? null,
    setsMax: exercise.target_sets ?? null,
    repsTarget: exercise.target_reps ?? null,
    repsMin: exercise.target_reps_min ?? exercise.target_reps ?? null,
    repsMax: exercise.target_reps_max ?? exercise.target_reps ?? null,
    weightMin: exercise.target_weight ?? null,
    weightMax: exercise.target_weight ?? null,
    weightUnit: exercise.target_weight_unit ?? null,
    durationSeconds: exercise.target_duration_seconds ?? null,
    distance: exercise.target_distance ?? null,
    distanceUnit: exercise.target_distance_unit ?? null,
    calories: exercise.target_calories ?? null,
  };
}

export function resolveRoutineExerciseRepTarget(exercise: Pick<RoutineDayExerciseRow, "target_reps" | "target_reps_min" | "target_reps_max">) {
  return exercise.target_reps ?? exercise.target_reps_max ?? exercise.target_reps_min ?? null;
}

export function getProgressionReviewTargetFingerprintForExercise(exercise: RoutineDayExerciseRow) {
  const plan = buildProgressionReviewTargetPlan(exercise);
  const selection = validateProgressionPlaybookSelection({
    playbookId: exercise.progression_playbook_id,
    config: exercise.progression_playbook_config,
  });

  return getProgressionTargetFingerprint({
    exerciseId: exercise.exercise_id,
    target: plan,
    progressionMethod: selection ? normalizeProgressionMethodLayerId(selection.id) : "manual",
    progressionStep: selection
      ? {
          loadIncrement: selection.config.loadIncrement,
          stepOverrides: selection.config.stepOverrides ?? null,
        }
      : null,
    setFlow: selection?.config.setFlow ?? "straight_sets",
    regressionPolicy: selection && "stallPolicy" in selection.config ? selection.config.stallPolicy : "none",
  });
}

export async function loadProgressionHistoryForExercise(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  exerciseId: string;
  routineDayExerciseId?: string | null;
  allowCatalogFallback?: boolean;
}) {
  const { data: sessionExercisesData, error: sessionExercisesError } = await args.supabase
    .from("session_exercises")
    .select("id, exercise_id, routine_day_exercise_id, session:sessions!inner(performed_at, status, routine_id)")
    .eq("user_id", args.userId)
    .eq("exercise_id", args.exerciseId)
    .eq("session.status", "completed")
    .eq("session.routine_id", args.routineId);

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseMetaById = new Map<string, { performedAt: string; routineDayExerciseId: string | null }>();
  for (const row of (sessionExercisesData ?? []) as Array<{
    id: string;
    routine_day_exercise_id?: string | null;
    session?: { performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null } | Array<{ performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !sessionRow?.performed_at || sessionRow.status !== "completed" || sessionRow.routine_id !== args.routineId) {
      continue;
    }

    sessionExerciseMetaById.set(row.id, {
      performedAt: sessionRow.performed_at,
      routineDayExerciseId: row.routine_day_exercise_id ?? null,
    });
  }

  const sessionExerciseIds = [...sessionExerciseMetaById.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await args.supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, is_warmup")
        .eq("user_id", args.userId)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const rows = ((setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    duration_seconds: number | null;
    distance: number | null;
    distance_unit: FitnessDistanceUnit | null;
    calories: number | null;
    is_warmup: boolean;
  }>)
    .map((row): ProgressionHistorySetRow | null => {
      const meta = sessionExerciseMetaById.get(row.session_exercise_id);
      if (!meta) {
        return null;
      }

      return {
        sessionId: row.session_exercise_id,
        performedAt: meta.performedAt,
        setIndex: row.set_index,
        weight: row.weight ?? null,
        reps: row.reps ?? null,
        weightUnit: row.weight_unit ?? null,
        durationSeconds: row.duration_seconds ?? null,
        distance: row.distance ?? null,
        distanceUnit: row.distance_unit ?? null,
        calories: row.calories ?? null,
        isWarmup: row.is_warmup,
      };
    })
    .filter((row): row is ProgressionHistorySetRow => row !== null);

  if (!args.routineDayExerciseId) {
    return rows;
  }

  const directSessionExerciseIds = new Set(
    [...sessionExerciseMetaById.entries()]
      .filter(([, meta]) => meta.routineDayExerciseId === args.routineDayExerciseId)
      .map(([sessionExerciseId]) => sessionExerciseId),
  );
  const directRows = rows.filter((row) => directSessionExerciseIds.has(row.sessionId));
  if (directRows.length > 0) {
    return directRows;
  }

  return args.allowCatalogFallback ? rows : [];
}

export async function canUseCatalogHistoryFallbackForRoutineExercise(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  exerciseId: string;
}) {
  const { data: routineDays, error: routineDaysError } = await args.supabase
    .from("routine_days")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId);

  if (routineDaysError) {
    return false;
  }

  const routineDayIds = (routineDays ?? []).map((day) => day.id).filter((id): id is string => Boolean(id));
  if (routineDayIds.length === 0) {
    return false;
  }

  const { count, error } = await args.supabase
    .from("routine_day_exercises")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId)
    .eq("exercise_id", args.exerciseId)
    .in("routine_day_id", routineDayIds);

  if (error) {
    return false;
  }

  return (count ?? 0) === 1;
}

export type ProgressionUpdatesDisplayData = {
  readyItems: ProgressionReviewDisplayItem[];
  statusItems: ProgressionStatusDisplayItem[];
  statusReport: ProgressionUpdatesStatusReport;
};

export type ProgressionUpdatesStatusReportRow = {
  id: string;
  dayGroupId: string | null;
  dayName: string | null;
  exerciseName: string;
  lane: "ready_update" | "progress_status";
  state: string;
  label: string;
  actionLabel: string | null;
  summaryLine: string;
  usedLine: string | null;
  needsLine: string | null;
  resultLine: string | null;
  reason: string;
};

export type ProgressionUpdatesStatusReportDay = {
  dayGroupId: string | null;
  dayName: string | null;
  readyCount: number;
  statusCount: number;
  rows: ProgressionUpdatesStatusReportRow[];
};

export type ProgressionUpdatesStatusReport = {
  readyCount: number;
  statusCount: number;
  totalCount: number;
  days: ProgressionUpdatesStatusReportDay[];
};

export type ProgressionReadyUpdateCollapseEntry = {
  item: ProgressionReviewDisplayItem;
  exerciseId: string | null;
  targetFingerprint: string;
  proposedTargetFingerprint: string;
  linkedTargets: Array<{
    routineDayExerciseId: string;
    dayName: string;
    dayGroupId?: string | null;
  }>;
};

function getProgressionTargetPlanKey(target: ProgressionTargetPlan | null) {
  return JSON.stringify(target ?? null);
}

function formatLinkedReadyUpdateReason(item: ProgressionReviewDisplayItem, dayNames: string[]) {
  if (dayNames.length <= 1) {
    return item.reason;
  }

  return `${item.reason} Same target exists on ${dayNames.length} routine days. Promote applies the linked target group.`;
}

export function collapseLinkedProgressionReadyUpdates(entries: ProgressionReadyUpdateCollapseEntry[]) {
  const indexByKey = new Map<string, number>();
  const groups: ProgressionReadyUpdateCollapseEntry[][] = [];

  for (const entry of entries) {
    const key = [
      entry.exerciseId ?? "exercise",
      entry.targetFingerprint,
      entry.proposedTargetFingerprint,
      entry.item.type,
    ].join("::");
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, groups.length);
      groups.push([entry]);
      continue;
    }

    groups[existingIndex]?.push(entry);
  }

  return groups.map((group) => {
    const representative = group[0]?.item;
    if (!representative || group.length === 1) {
      return representative;
    }

    const targetById = new Map<string, { routineDayExerciseId: string; dayName: string; dayGroupId?: string | null }>();
    for (const entry of group) {
      const targets = entry.linkedTargets.length > 0
        ? entry.linkedTargets
        : [{ routineDayExerciseId: entry.item.id, dayName: entry.item.dayName?.trim() || "Routine day", dayGroupId: entry.item.dayGroupId ?? null }];
      for (const target of targets) {
        if (!targetById.has(target.routineDayExerciseId)) {
          targetById.set(target.routineDayExerciseId, target);
        }
      }
    }
    const targets = [...targetById.values()];
    const routineDayExerciseIds = targets.map((target) => target.routineDayExerciseId);
    const dayNames = Array.from(new Set(targets.map((target) => target.dayName).filter(Boolean)));

    return {
      ...representative,
      reason: formatLinkedReadyUpdateReason(representative, dayNames),
      linkedUpdate: {
        count: routineDayExerciseIds.length,
        dayNames,
        routineDayExerciseIds,
        targets,
        displayOnly: true,
      },
    } satisfies ProgressionReviewDisplayItem;
  }).filter((item): item is ProgressionReviewDisplayItem => Boolean(item));
}

export function buildProgressionUpdatesStatusReport(args: {
  readyItems: ProgressionReviewDisplayItem[];
  statusItems: ProgressionStatusDisplayItem[];
}): ProgressionUpdatesStatusReport {
  const rows: ProgressionUpdatesStatusReportRow[] = [
    ...args.readyItems.map((item): ProgressionUpdatesStatusReportRow => ({
      id: item.id,
      dayGroupId: item.dayGroupId ?? null,
      dayName: item.dayName ?? null,
      exerciseName: item.exerciseName,
      lane: "ready_update",
      state: item.type,
      label: item.badgeLabel,
      actionLabel: item.actionLabel,
      summaryLine: item.summary,
      usedLine: item.evidence?.usedLine ?? null,
      needsLine: item.evidence?.needsLine ?? null,
      resultLine: item.evidence?.resultLine ?? null,
      reason: item.reason,
    })),
    ...args.statusItems.map((item): ProgressionUpdatesStatusReportRow => ({
      id: item.id,
      dayGroupId: item.dayGroupId ?? null,
      dayName: item.dayName ?? null,
      exerciseName: item.exerciseName,
      lane: "progress_status",
      state: item.statusType,
      label: item.label,
      actionLabel: null,
      summaryLine: `${item.exerciseName}: ${item.label}`,
      usedLine: item.latestLine,
      needsLine: item.targetLine,
      resultLine: item.detailLine,
      reason: item.reason,
    })),
  ];

  const dayIndexByKey = new Map<string, number>();
  const days: ProgressionUpdatesStatusReportDay[] = [];
  for (const row of rows) {
    const key = row.dayGroupId ?? row.dayName ?? "routine-day";
    const existingIndex = dayIndexByKey.get(key);
    if (existingIndex === undefined) {
      dayIndexByKey.set(key, days.length);
      days.push({
        dayGroupId: row.dayGroupId,
        dayName: row.dayName,
        readyCount: row.lane === "ready_update" ? 1 : 0,
        statusCount: row.lane === "progress_status" ? 1 : 0,
        rows: [row],
      });
      continue;
    }

    const day = days[existingIndex];
    if (!day) {
      continue;
    }
    day.rows.push(row);
    if (row.lane === "ready_update") {
      day.readyCount += 1;
    } else {
      day.statusCount += 1;
    }
  }

  return {
    readyCount: args.readyItems.length,
    statusCount: args.statusItems.length,
    totalCount: rows.length,
    days,
  };
}

export function isUserFacingProgressionUpdatesExercise(exercise: Pick<
  RoutineDayExerciseRow,
  | "measurement_type"
  | "progression_playbook_id"
  | "target_sets"
  | "target_reps"
  | "target_reps_min"
  | "target_reps_max"
  | "target_weight"
  | "target_duration_seconds"
  | "target_distance"
  | "target_calories"
> & { exerciseName?: string | null }) {
  const measurementType = exercise.measurement_type ?? "reps";
  const exerciseName = "exerciseName" in exercise && typeof exercise.exerciseName === "string"
    ? exercise.exerciseName.trim().toLowerCase()
    : "";
  if (exerciseName === "stretch" || exerciseName === "zone 2 cardio") {
    return false;
  }

  if (measurementType === "none") {
    return false;
  }

  const hasTarget = [
    exercise.target_sets,
    exercise.target_reps,
    exercise.target_reps_min,
    exercise.target_reps_max,
    exercise.target_weight,
    exercise.target_duration_seconds,
    exercise.target_distance,
    exercise.target_calories,
  ].some((value) => typeof value === "number" && Number.isFinite(value) && value > 0);

  return Boolean(exercise.progression_playbook_id) || hasTarget;
}

function toProgressionHistoryScopeTier(source: ProgressionAuditHistorySource): ProgressionHistoryScopeTier {
  switch (source) {
  case "routine_day_exercise_id":
    return "routine_day_exercise";
  case "unique_catalog_exercise_id_fallback":
    return "unique_active_routine_exercise";
  case "linked_same_fingerprint":
    return "linked_same_fingerprint";
  case "global_exercise_context":
    return "global_exercise_context";
  case "blocked_duplicate_catalog_fallback":
  case "none":
    return "none";
  }
}

export async function loadProgressionUpdatesDisplayData(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  fallbackWeightUnit: "lbs" | "kg";
  exercises: RoutineDayExerciseRow[];
  exerciseNameByRoutineExerciseId: Map<string, string>;
  routineDayNameById: Map<string, string>;
}) {
  const progressionExercises = args.exercises.filter((exercise) => isUserFacingProgressionUpdatesExercise({
    ...exercise,
    exerciseName: args.exerciseNameByRoutineExerciseId.get(exercise.id) ?? null,
  }));
  if (progressionExercises.length === 0) {
    const statusReport = buildProgressionUpdatesStatusReport({ readyItems: [], statusItems: [] });
    return { readyItems: [], statusItems: [], statusReport } satisfies ProgressionUpdatesDisplayData;
  }

  const progressionExerciseIds = Array.from(new Set(
    progressionExercises
      .map((exercise) => exercise.exercise_id)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
  ));
  const routineExerciseCountByCatalogExerciseId = progressionExercises.reduce((counts, exercise) => {
    if (exercise.exercise_id) {
      counts.set(exercise.exercise_id, (counts.get(exercise.exercise_id) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());

  if (progressionExerciseIds.length === 0) {
    const statusReport = buildProgressionUpdatesStatusReport({ readyItems: [], statusItems: [] });
    return { readyItems: [], statusItems: [], statusReport } satisfies ProgressionUpdatesDisplayData;
  }

  const { data: exerciseMetadataData } = await args.supabase
    .from("exercises")
    .select("id, equipment, movement_pattern")
    .in("id", progressionExerciseIds);
  const exerciseMetadataById = new Map(
    ((exerciseMetadataData ?? []) as Array<{ id: string; equipment?: string | null; movement_pattern?: string | null }>)
      .map((exercise) => [exercise.id, {
        equipment: exercise.equipment ?? null,
        movementPattern: exercise.movement_pattern ?? null,
      }] as const),
  );

  const { data: sessionExercisesData, error: sessionExercisesError } = await args.supabase
    .from("session_exercises")
    .select("id, exercise_id, routine_day_exercise_id, session:sessions!inner(performed_at, status, routine_id)")
    .eq("user_id", args.userId)
    .in("exercise_id", progressionExerciseIds)
    .eq("session.status", "completed");

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseMetaById = new Map<string, { exerciseId: string; routineDayExerciseId: string | null; performedAt: string; routineId: string | null }>();
  for (const row of (sessionExercisesData ?? []) as Array<{
    id: string;
    exercise_id: string;
    routine_day_exercise_id?: string | null;
    session?: { performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null } | Array<{ performed_at?: string | null; status?: "completed" | "in_progress"; routine_id?: string | null }> | null;
  }>) {
    const sessionRow = Array.isArray(row.session) ? (row.session[0] ?? null) : (row.session ?? null);
    if (!row.id || !row.exercise_id || !sessionRow?.performed_at || sessionRow.status !== "completed") {
      continue;
    }

    sessionExerciseMetaById.set(row.id, {
      exerciseId: row.exercise_id,
      routineDayExerciseId: row.routine_day_exercise_id ?? null,
      performedAt: sessionRow.performed_at,
      routineId: sessionRow.routine_id ?? null,
    });
  }

  const sessionExerciseIds = [...sessionExerciseMetaById.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await args.supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, is_warmup")
        .eq("user_id", args.userId)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const historyRowsByRoutineDayExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  const fallbackHistoryRowsByExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  const globalContextRowsByExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  for (const row of (setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    duration_seconds: number | null;
    distance: number | null;
    distance_unit: FitnessDistanceUnit | null;
    calories: number | null;
    is_warmup: boolean;
  }>) {
    const meta = sessionExerciseMetaById.get(row.session_exercise_id);
    if (!meta) {
      continue;
    }

    const historyRow = {
      sessionId: row.session_exercise_id,
      performedAt: meta.performedAt,
      setIndex: row.set_index,
      weight: row.weight ?? null,
      reps: row.reps ?? null,
      weightUnit: row.weight_unit ?? null,
      durationSeconds: row.duration_seconds ?? null,
      distance: row.distance ?? null,
      distanceUnit: row.distance_unit ?? null,
      calories: row.calories ?? null,
      isWarmup: row.is_warmup,
    };

    if (meta.routineId !== args.routineId) {
      const globalContext = globalContextRowsByExerciseId.get(meta.exerciseId) ?? [];
      globalContext.push(historyRow);
      globalContextRowsByExerciseId.set(meta.exerciseId, globalContext);
      continue;
    }

    if (meta.routineDayExerciseId) {
      const current = historyRowsByRoutineDayExerciseId.get(meta.routineDayExerciseId) ?? [];
      current.push(historyRow);
      historyRowsByRoutineDayExerciseId.set(meta.routineDayExerciseId, current);
      continue;
    }

    const fallback = fallbackHistoryRowsByExerciseId.get(meta.exerciseId) ?? [];
    fallback.push(historyRow);
    fallbackHistoryRowsByExerciseId.set(meta.exerciseId, fallback);
  }

  const readyItemEntries: ProgressionReadyUpdateCollapseEntry[] = [];
  const statusItems: ProgressionStatusDisplayItem[] = [];
  const targetFingerprintByRoutineExerciseId = new Map<string, string>();
  const routineExerciseIdsByFingerprint = new Map<string, string[]>();
  const routineDayIdByRoutineExerciseId = new Map<string, string>();

  for (const exercise of progressionExercises) {
    const targetFingerprint = getProgressionReviewTargetFingerprintForExercise(exercise);
    targetFingerprintByRoutineExerciseId.set(exercise.id, targetFingerprint);
    routineDayIdByRoutineExerciseId.set(exercise.id, exercise.routine_day_id);
    const group = routineExerciseIdsByFingerprint.get(targetFingerprint) ?? [];
    group.push(exercise.id);
    routineExerciseIdsByFingerprint.set(targetFingerprint, group);
  }

  for (const exercise of progressionExercises) {
    const plan = buildProgressionReviewTargetPlan(exercise);
    const directHistoryRows = historyRowsByRoutineDayExerciseId.get(exercise.id) ?? [];
    const allFallbackHistoryRows = fallbackHistoryRowsByExerciseId.get(exercise.exercise_id) ?? [];
    const canUseFallback = routineExerciseCountByCatalogExerciseId.get(exercise.exercise_id) === 1;
    const fallbackHistoryRows = canUseFallback ? allFallbackHistoryRows : [];
    const targetFingerprint = targetFingerprintByRoutineExerciseId.get(exercise.id) ?? "";
    const linkedRoutineExerciseIds = (routineExerciseIdsByFingerprint.get(targetFingerprint) ?? []).filter((id) => id !== exercise.id);
    const linkedHistoryRows = linkedRoutineExerciseIds.flatMap((id) => historyRowsByRoutineDayExerciseId.get(id) ?? []);
    const globalContextRows = globalContextRowsByExerciseId.get(exercise.exercise_id) ?? [];
    const selectedHistoryRows = directHistoryRows.length > 0 ? directHistoryRows : fallbackHistoryRows;
    const blockedDuplicateFallbackRows = allFallbackHistoryRows.length > 0 && !canUseFallback ? allFallbackHistoryRows : [];
    const contextHistoryRows = selectedHistoryRows.length > 0
      ? selectedHistoryRows
      : linkedHistoryRows.length > 0
        ? linkedHistoryRows
        : blockedDuplicateFallbackRows.length > 0
          ? blockedDuplicateFallbackRows
          : globalContextRows;
    const auditHistorySource: ProgressionAuditHistorySource = directHistoryRows.length > 0
      ? "routine_day_exercise_id"
      : allFallbackHistoryRows.length > 0 && !canUseFallback
        ? "blocked_duplicate_catalog_fallback"
        : fallbackHistoryRows.length > 0
          ? "unique_catalog_exercise_id_fallback"
          : linkedHistoryRows.length > 0
            ? "linked_same_fingerprint"
            : globalContextRows.length > 0
              ? "global_exercise_context"
              : "none";
    const candidateHistoryRows = auditHistorySource === "routine_day_exercise_id" || auditHistorySource === "unique_catalog_exercise_id_fallback"
      ? selectedHistoryRows
      : [];
    const history = buildProgressionHistorySessions({
      rows: candidateHistoryRows,
      targetSetCount: exercise.target_sets,
      topRepTarget: resolveRoutineExerciseRepTarget(exercise),
      limit: 8,
    });
    const selection = validateProgressionPlaybookSelection({
      playbookId: exercise.progression_playbook_id,
      config: exercise.progression_playbook_config,
    });
    const exerciseMetadata = exerciseMetadataById.get(exercise.exercise_id ?? "");
    const progressionStepPolicy = selection
      ? inferProgressionStepPolicy({
          measurementType: plan.measurementType,
          equipment: exerciseMetadata?.equipment ?? null,
          movementPattern: exerciseMetadata?.movementPattern ?? null,
          defaultUnit: exercise.default_unit,
          weightUnit: plan.weightUnit ?? args.fallbackWeightUnit,
          distanceUnit: plan.distanceUnit ?? null,
          targetWeight: plan.weightMax ?? plan.weightMin ?? null,
          exerciseOverrideValue: selection.config.loadIncrement,
          stepOverrides: selection.config.stepOverrides ?? null,
        })
      : null;
    const candidate = deriveProgressionReviewCandidate({
      playbookId: exercise.progression_playbook_id,
      config: exercise.progression_playbook_config,
      plan,
      history,
      historyRows: candidateHistoryRows,
      fallbackWeightUnit: args.fallbackWeightUnit,
      progressionStepPolicy,
    });
    const exerciseName = args.exerciseNameByRoutineExerciseId.get(exercise.id) ?? "Exercise";
    const dayName = args.routineDayNameById.get(exercise.routine_day_id) ?? null;
    const readyItemBase = formatProgressionReviewDisplayItem({
      id: exercise.id,
      exerciseName,
      dayName,
      dayGroupId: exercise.routine_day_id,
      candidate,
      debug: {
        historySource: auditHistorySource,
        historySetCount: candidateHistoryRows.length,
        historySessionCount: history.length,
      },
    });
    const readyItem = readyItemBase ? {
      ...readyItemBase,
      evidence: formatProgressionCalculationEvidence({
        candidate,
        rejectionReason: null,
        historySource: auditHistorySource,
        linkedMatchCount: linkedRoutineExerciseIds.length + 1,
        historyRows: candidate.sourceSession
          ? candidateHistoryRows.filter((row) => row.sessionId === candidate.sourceSession?.sessionId)
          : candidateHistoryRows,
        plan,
      }),
      progress: deriveProgressionProgressPercent({
        plan,
        historyRows: candidate.sourceSession
          ? candidateHistoryRows.filter((row) => row.sessionId === candidate.sourceSession?.sessionId)
          : candidateHistoryRows,
        isReady: true,
      }),
    } : null;

    if (readyItem) {
      const linkedRoutineDayExerciseIds = [exercise.id, ...linkedRoutineExerciseIds];
      const linkedTargets = linkedRoutineDayExerciseIds
          .map((routineDayExerciseId) => {
            const routineDayId = routineDayIdByRoutineExerciseId.get(routineDayExerciseId);
            const linkedDayName = routineDayId ? args.routineDayNameById.get(routineDayId)?.trim() : null;
            return linkedDayName ? { routineDayExerciseId, dayName: linkedDayName, dayGroupId: routineDayId } : null;
          })
          .filter((target): target is { routineDayExerciseId: string; dayName: string; dayGroupId: string } => target !== null);
      readyItemEntries.push({
        item: readyItem,
        exerciseId: exercise.exercise_id ?? null,
        targetFingerprint,
        proposedTargetFingerprint: getProgressionTargetPlanKey(candidate.proposedTarget),
        linkedTargets,
      });
      continue;
    }

    const rejectionReason = inferProgressionAuditRejectionReason({
      candidate,
      hasConfiguredPlaybook: Boolean(exercise.progression_playbook_id),
      hasValidSelection: selection !== null,
      historySource: auditHistorySource,
      completedSetCount: contextHistoryRows.length,
      completedSessionCount: history.length,
      measurementType: plan.measurementType,
    });
    const evaluationFingerprint = getProgressionEvaluationFingerprint({
      routineDayExerciseId: exercise.id,
      targetFingerprint,
      progressionConfigFingerprint: exercise.progression_playbook_config,
      historySource: toProgressionHistoryScopeTier(auditHistorySource),
      latestCompletedSessionTimestamp: contextHistoryRows
        .map((row) => row.performedAt)
        .sort((left, right) => right.localeCompare(left))[0] ?? null,
      completedSetCount: contextHistoryRows.length,
    });
    const statusItem = formatProgressionStatusDisplayItem({
      id: exercise.id,
      exerciseName,
      dayName,
      dayGroupId: exercise.routine_day_id,
      candidate,
      rejectionReason,
      historySource: auditHistorySource,
      linkedMatchCount: linkedRoutineExerciseIds.length + 1,
      historyRows: contextHistoryRows,
      plan,
    });

    if (statusItem) {
      void evaluationFingerprint;
      statusItems.push(statusItem);
    }
  }

  const readyItems = collapseLinkedProgressionReadyUpdates(readyItemEntries);
  const linkedReadyRoutineDayExerciseIds = new Set(
    readyItems.flatMap((item) => item.linkedUpdate?.routineDayExerciseIds ?? [item.id]),
  );
  const visibleStatusItems = statusItems.filter((item) => !linkedReadyRoutineDayExerciseIds.has(item.id));
  const statusReport = buildProgressionUpdatesStatusReport({ readyItems, statusItems: visibleStatusItems });
  return { readyItems, statusItems: visibleStatusItems, statusReport } satisfies ProgressionUpdatesDisplayData;
}

export async function loadProgressionReviewItems(args: Parameters<typeof loadProgressionUpdatesDisplayData>[0]) {
  const { readyItems } = await loadProgressionUpdatesDisplayData(args);
  return readyItems;
}
