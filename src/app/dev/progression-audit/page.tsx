import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSupabaseTargetDiagnostic } from "@/lib/dev-supabase-target";
import { formatDurationClock } from "@/lib/duration";
import { formatDistance } from "@/lib/exercise-stats-formatting";
import { formatWeight } from "@/lib/formatting";
import { ensureProfile } from "@/lib/profile";
import {
  formatProgressionAuditRejectionReason,
  inferProgressionAuditRejectionReason,
  type ProgressionAuditHistorySource,
  type ProgressionAuditRejectionReason,
} from "@/lib/progression-candidate-audit";
import {
  getProgressionEvaluationFingerprint,
  getProgressionTargetFingerprint,
  type ProgressionHistoryScopeTier,
} from "@/lib/progression-history-scope";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  normalizeProgressionMethodLayerId,
  validateProgressionPlaybookSelection,
  type ProgressionHistorySetRow,
  type ProgressionMeasurementType,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";
import { formatProgressionStepValue, inferProgressionStepPolicy, type ProgressionStepPolicy } from "@/lib/progression-step-policy";
import {
  getProgressionQualificationPolicyLabel,
  getProgressionVectorLabel,
  resolveProgressionQualificationPolicy,
  resolveProgressionVectorForPlan,
} from "@/lib/progression-vector";
import { canAccessQaLlelUi } from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRow, RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";
import { formatProgressionStatusDisplayItem } from "@/lib/progression-status-display";

export const dynamic = "force-dynamic";

type SessionExerciseMeta = {
  sessionExerciseId: string;
  exerciseId: string;
  routineDayExerciseId: string | null;
  performedAt: string;
  sessionId: string;
  routineId: string | null;
  routineDayIndex: number | null;
  isSkipped: boolean;
};

type AuditHistoryBucket = {
  source: ProgressionAuditHistorySource;
  selectedRows: ProgressionHistorySetRow[];
  selectedSessionIds: Set<string>;
  skippedCount: number;
  latestCompletedSessionDate: string | null;
  blockedFallbackSetCount: number;
  blockedFallbackSessionCount: number;
};

type AuditRow = {
  routineName: string;
  dayName: string;
  dayIndex: number;
  routineDayExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  measurementType: ProgressionMeasurementType;
  equipment: string | null;
  movementPattern: string | null;
  progressionMethod: string;
  regressionPolicy: string;
  setFlow: string;
  progressionStepPolicy: ProgressionStepPolicy;
  progressionVector: string;
  qualificationPolicy: string;
  target: ProgressionTargetPlan;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  targetWeightUnit: "lbs" | "kg" | null;
  targetDurationSeconds: number | null;
  targetDistance: number | null;
  targetDistanceUnit: "mi" | "km" | "m" | null;
  targetCalories: number | null;
  historySource: ProgressionAuditHistorySource;
  completedSetCount: number;
  completedSessionCount: number;
  plannedRowSetCount: number;
  linkedContextSetCount: number;
  globalExerciseSetCount: number;
  skippedCount: number;
  latestCompletedSessionDate: string | null;
  bestSetSummary: string;
  reviewWindowStatus: string;
  candidateType: string;
  proposedTarget: string | null;
  currentTarget: string | null;
  reason: string;
  rejectionReason: ProgressionAuditRejectionReason | null;
  blockedFallbackSetCount: number;
  blockedFallbackSessionCount: number;
  targetFingerprint: string;
  linkedMatchCount: number;
  evaluationFingerprint: string;
  candidateSourceSessionDate: string | null;
  candidateSourceIsLatest: boolean | null;
  userFacingStatusLabel: string;
};

function normalizeMeasurementType(value: unknown): ProgressionMeasurementType {
  return value === "time" || value === "distance" || value === "time_distance" || value === "none" ? value : "reps";
}

function buildProgressionReviewTargetPlan(exercise: RoutineDayExerciseRow): ProgressionTargetPlan {
  return {
    measurementType: normalizeMeasurementType(exercise.measurement_type),
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

function resolveRoutineExerciseRepTarget(exercise: Pick<RoutineDayExerciseRow, "target_reps" | "target_reps_min" | "target_reps_max">) {
  return exercise.target_reps ?? exercise.target_reps_max ?? exercise.target_reps_min ?? null;
}

function normalizeSessionRelation(value: unknown) {
  const row = Array.isArray(value) ? (value[0] ?? null) : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  return row as {
    id?: string | null;
    performed_at?: string | null;
    status?: string | null;
    routine_id?: string | null;
    routine_day_index?: number | null;
  };
}

function addToMapArray<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function sortRows(rows: ProgressionHistorySetRow[]) {
  return [...rows].sort((a, b) => {
    const dateOrder = b.performedAt.localeCompare(a.performedAt);
    return dateOrder !== 0 ? dateOrder : a.setIndex - b.setIndex;
  });
}

function latestDateFromRows(rows: ProgressionHistorySetRow[]) {
  return sortRows(rows)[0]?.performedAt ?? null;
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return "None";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSetSummary(rows: ProgressionHistorySetRow[], measurementType: ProgressionMeasurementType) {
  const workRows = sortRows(rows).filter((row) => !row.isWarmup);
  if (workRows.length === 0) {
    return "No completed work sets";
  }

  if (measurementType === "reps") {
    const latestSessionId = workRows[0]?.sessionId ?? null;
    const latestRows = latestSessionId ? workRows.filter((row) => row.sessionId === latestSessionId) : workRows;
    const reps = latestRows
      .map((row) => typeof row.reps === "number" ? row.reps : null)
      .filter((value): value is number => value !== null);
    const loadedRow = latestRows.find((row) => typeof row.weight === "number" && row.weight > 0);
    const weight = loadedRow ? formatWeight(loadedRow.weight, loadedRow.weightUnit) : null;
    return `${reps.length ? reps.join("/") : "no reps"}${weight ? ` at ${weight}` : ""}`;
  }

  const bestDuration = Math.max(0, ...workRows.map((row) => row.durationSeconds ?? 0));
  const bestDistanceRow = workRows
    .filter((row) => typeof row.distance === "number" && row.distance > 0)
    .sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0))[0] ?? null;
  const parts = [
    bestDuration > 0 ? formatDurationClock(bestDuration) : null,
    bestDistanceRow?.distance ? formatDistance(bestDistanceRow.distance, bestDistanceRow.distanceUnit ?? null) : null,
    Math.max(0, ...workRows.map((row) => row.calories ?? 0)) > 0
      ? `${Math.max(0, ...workRows.map((row) => row.calories ?? 0))} cal`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : `${workRows.length} logged set${workRows.length === 1 ? "" : "s"}`;
}

function formatTargetParts(row: AuditRow) {
  return [
    row.targetSets ? `${row.targetSets} sets` : null,
    row.targetRepsMin || row.targetRepsMax ? `${row.targetRepsMin ?? row.targetRepsMax}-${row.targetRepsMax ?? row.targetRepsMin} reps` : null,
    row.targetWeight ? formatWeight(row.targetWeight, row.targetWeightUnit) : null,
    row.targetDurationSeconds ? formatDurationClock(row.targetDurationSeconds) : null,
    row.targetDistance ? formatDistance(row.targetDistance, row.targetDistanceUnit) : null,
    row.targetCalories ? `${row.targetCalories} cal` : null,
  ].filter((part): part is string => Boolean(part));
}

function getSetFlowLabel(value: unknown) {
  if (value === "ascending_ramp") return "Ascending Sets";
  if (value === "descending_backoff") return "Descending Sets";
  return "Straight Sets";
}

function getRegressionPolicyLabel(value: unknown) {
  return value === "deload_after_stall" ? "Deload" : "None";
}

function getProgressionMethodLabel(value: unknown) {
  const normalized = normalizeProgressionMethodLayerId(value);
  if (normalized === "double_progression") return "Double Progression";
  if (normalized === "hold_and_review") return "Manual Review";
  if (normalized === "cardio_progression") return "Cardio Progression";
  return "Manual";
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

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "green" | "yellow" | "danger" }) {
  const toneClass = tone === "green"
    ? "border-[rgb(var(--accent)/0.32)] text-[rgb(var(--accent)/0.98)]"
    : tone === "yellow"
      ? "border-[rgb(var(--accent-warning)/0.36)] text-[rgb(var(--accent-warning)/0.98)]"
      : tone === "danger"
        ? "border-red-400/40 text-red-200"
        : "border-[rgb(var(--border-strong)/0.14)] text-[rgb(var(--text-muted)/0.9)]";

  return (
    <span className={`inline-flex rounded-full border bg-[rgb(var(--surface-1-rgb)/0.22)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}>
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.72)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[rgb(var(--text-primary)/0.94)]">{value}</div>
    </div>
  );
}

function AuditCard({ row }: { row: AuditRow }) {
  const targetParts = formatTargetParts(row);
  const stepValue = formatProgressionStepValue(row.progressionStepPolicy);
  const stepValueLabel = stepValue === "-" ? "no valid step" : stepValue;
  const candidateTone = row.candidateType === "promote" || row.candidateType === "review"
    ? "green"
    : row.candidateType === "deload"
      ? "yellow"
      : "muted";
  const rejectionTone = row.rejectionReason === null
    ? "green"
    : row.rejectionReason === "duplicate_catalog_exercise_requires_routine_day_exercise_id" || row.rejectionReason === "invalid_config"
      ? "danger"
      : "yellow";

  return (
    <article className="rounded-[1.35rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.2)] p-4 shadow-[0_18px_40px_rgb(0_0_0/0.14)] backdrop-blur-[10px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="green">{row.dayName}</Pill>
            <Pill>Day {row.dayIndex}</Pill>
            <Pill>{row.measurementType}</Pill>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary)/0.98)]">{row.exerciseName}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.84)]">
            {row.routineDayExerciseId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={candidateTone}>{row.candidateType}</Pill>
          <Pill tone={rejectionTone}>{formatProgressionAuditRejectionReason(row.rejectionReason)}</Pill>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Method" value={row.progressionMethod} />
        <Field label="Regression" value={row.regressionPolicy} />
        <Field label="Sets Flow" value={row.setFlow} />
        <Field label="Step Policy" value={`${row.progressionStepPolicy.label ?? "None"}${stepValueLabel ? ` (${stepValueLabel})` : ""}`} />
        <Field label="Vector" value={row.progressionVector} />
        <Field label="Qualification" value={row.qualificationPolicy} />
        <Field label="Step Source" value={row.progressionStepPolicy.source} />
        <Field label="Equipment" value={row.equipment ?? "Unknown"} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Target" value={targetParts.length > 0 ? targetParts.join(" | ") : "Incomplete"} />
        <Field label="Candidate Target" value={row.proposedTarget ? `${row.currentTarget ?? "Current"} -> ${row.proposedTarget}` : row.currentTarget ?? "None"} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Field label="History Source" value={row.historySource} />
        <Field label="Completed Sets" value={row.completedSetCount} />
        <Field label="Completed Sessions" value={row.completedSessionCount} />
        <Field label="Skipped" value={row.skippedCount} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Field label="Planned Row Sets" value={row.plannedRowSetCount} />
        <Field label="Linked Sets" value={row.linkedContextSetCount} />
        <Field label="Global Exercise Sets" value={row.globalExerciseSetCount} />
        <Field label="User Label" value={row.userFacingStatusLabel} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Latest Session" value={formatOptionalDate(row.latestCompletedSessionDate)} />
        <Field label="Candidate Source" value={row.candidateSourceSessionDate ? `${formatOptionalDate(row.candidateSourceSessionDate)}${row.candidateSourceIsLatest === false ? " (older best)" : ""}` : "None"} />
        <Field label="Best / Latest Summary" value={row.bestSetSummary} />
        <Field label="Review Window" value={row.reviewWindowStatus} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Linked Matches" value={row.linkedMatchCount} />
        <Field label="Target Fingerprint" value={<span className="break-all text-[11px]">{row.targetFingerprint}</span>} />
        <Field label="Evaluation Fingerprint" value={<span className="break-all text-[11px]">{row.evaluationFingerprint}</span>} />
      </div>

      {row.historySource === "blocked_duplicate_catalog_fallback" ? (
        <div className="mt-3 rounded-[1rem] border border-red-400/24 bg-red-950/18 px-3 py-2 text-sm text-red-100">
          Catalog fallback was blocked because this catalog exercise appears more than once in the routine. Blocked fallback data:
          {" "}{row.blockedFallbackSetCount} sets across {row.blockedFallbackSessionCount} sessions.
        </div>
      ) : null}

      <div className="mt-3 rounded-[1rem] border border-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 py-2 text-sm leading-6 text-[rgb(var(--text-secondary)/0.94)]">
        <strong className="text-[rgb(var(--text-primary)/0.96)]">Reason:</strong> {row.reason}
      </div>
    </article>
  );
}

async function buildAuditRows() {
  const user = await requireUser({ route: "/dev/progression-audit" });
  const profile = await ensureProfile(user.id);
  if (!canAccessQaLlelUi(profile)) {
    notFound();
  }
  const activeRoutineId = profile.active_routine_id ?? null;

  if (!activeRoutineId) {
    return {
      activeRoutineId,
      routine: null,
      rows: [] as AuditRow[],
    };
  }

  const supabase = supabaseServer();
  const { data: routineData, error: routineError } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, weight_unit, default_progression_playbook_id, default_progression_playbook_config")
    .eq("id", activeRoutineId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (routineError) {
    throw routineError;
  }

  if (!routineData) {
    return {
      activeRoutineId,
      routine: null,
      rows: [] as AuditRow[],
    };
  }

  const routine = routineData as RoutineRow;
  const { data: dayData, error: dayError } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("user_id", user.id)
    .eq("routine_id", routine.id)
    .order("day_index", { ascending: true });

  if (dayError) {
    throw dayError;
  }

  const days = (dayData ?? []) as RoutineDayRow[];
  const dayIds = days.map((day) => day.id);
  if (dayIds.length === 0) {
    return { activeRoutineId, routine, rows: [] as AuditRow[] };
  }

  const { data: routineExerciseData, error: routineExerciseError } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config")
    .eq("user_id", user.id)
    .in("routine_day_id", dayIds)
    .order("position", { ascending: true });

  if (routineExerciseError) {
    throw routineExerciseError;
  }

  const routineExercises = (routineExerciseData ?? []) as RoutineDayExerciseRow[];
  const exerciseIds = [...new Set(routineExercises.map((exercise) => exercise.exercise_id).filter(Boolean))];
  const { data: exerciseData, error: exerciseError } = exerciseIds.length > 0
    ? await supabase
        .from("exercises")
        .select("id, name, user_id, is_global, primary_muscle, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, image_howto_path, how_to_short, created_at")
        .in("id", exerciseIds)
    : { data: [], error: null };

  if (exerciseError) {
    throw exerciseError;
  }

  const exerciseById = new Map((exerciseData ?? []).map((exercise) => [exercise.id, exercise as ExerciseRow]));
  const dayById = new Map(days.map((day) => [day.id, day]));
  const routineExerciseCountByCatalogExerciseId = routineExercises.reduce((counts, exercise) => {
    counts.set(exercise.exercise_id, (counts.get(exercise.exercise_id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  const { data: sessionExerciseData, error: sessionExerciseError } = exerciseIds.length > 0
    ? await supabase
        .from("session_exercises")
        .select("id, exercise_id, routine_day_exercise_id, is_skipped, session:sessions!inner(id, performed_at, status, routine_id, routine_day_index)")
        .eq("user_id", user.id)
        .in("exercise_id", exerciseIds)
        .eq("session.status", "completed")
    : { data: [], error: null };

  if (sessionExerciseError) {
    throw sessionExerciseError;
  }

  const metaBySessionExerciseId = new Map<string, SessionExerciseMeta>();
  for (const row of (sessionExerciseData ?? []) as Array<{
    id: string;
    exercise_id: string;
    routine_day_exercise_id?: string | null;
    is_skipped?: boolean | null;
    session?: unknown;
  }>) {
    const session = normalizeSessionRelation(row.session);
    if (!row.id || !row.exercise_id || !session?.id || !session.performed_at || session.status !== "completed") {
      continue;
    }

    metaBySessionExerciseId.set(row.id, {
      sessionExerciseId: row.id,
      exerciseId: row.exercise_id,
      routineDayExerciseId: row.routine_day_exercise_id ?? null,
      performedAt: session.performed_at,
      sessionId: session.id,
      routineId: session.routine_id ?? null,
      routineDayIndex: typeof session.routine_day_index === "number" ? session.routine_day_index : null,
      isSkipped: row.is_skipped === true,
    });
  }

  const sessionExerciseIds = [...metaBySessionExerciseId.keys()];
  const { data: setsData, error: setsError } = sessionExerciseIds.length > 0
    ? await supabase
        .from("sets")
        .select("session_exercise_id, set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, is_warmup")
        .eq("user_id", user.id)
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true })
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const directRowsByRoutineDayExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  const fallbackRowsByExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  const globalRowsByExerciseId = new Map<string, ProgressionHistorySetRow[]>();
  const selectedSessionIdsByRoutineDayExerciseId = new Map<string, Set<string>>();
  const fallbackSessionIdsByExerciseId = new Map<string, Set<string>>();
  const globalSessionIdsByExerciseId = new Map<string, Set<string>>();
  const skippedByRoutineDayExerciseId = new Map<string, number>();
  const skippedFallbackByExerciseId = new Map<string, number>();

  for (const meta of metaBySessionExerciseId.values()) {
    if (meta.isSkipped) {
      if (meta.routineId !== routine.id) {
        continue;
      }
      if (meta.routineDayExerciseId) {
        skippedByRoutineDayExerciseId.set(meta.routineDayExerciseId, (skippedByRoutineDayExerciseId.get(meta.routineDayExerciseId) ?? 0) + 1);
      } else {
        skippedFallbackByExerciseId.set(meta.exerciseId, (skippedFallbackByExerciseId.get(meta.exerciseId) ?? 0) + 1);
      }
    }
  }

  for (const row of (setsData ?? []) as Array<{
    session_exercise_id: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    weight_unit: "lbs" | "kg" | null;
    duration_seconds: number | null;
    distance: number | null;
    distance_unit: "mi" | "km" | "m" | null;
    calories: number | null;
    is_warmup: boolean;
  }>) {
    const meta = metaBySessionExerciseId.get(row.session_exercise_id);
    if (!meta) {
      continue;
    }

    const historyRow: ProgressionHistorySetRow = {
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

    if (meta.routineId !== routine.id) {
      addToMapArray(globalRowsByExerciseId, meta.exerciseId, historyRow);
      const sessionIds = globalSessionIdsByExerciseId.get(meta.exerciseId) ?? new Set<string>();
      sessionIds.add(meta.sessionId);
      globalSessionIdsByExerciseId.set(meta.exerciseId, sessionIds);
      continue;
    }

    if (meta.routineDayExerciseId) {
      addToMapArray(directRowsByRoutineDayExerciseId, meta.routineDayExerciseId, historyRow);
      const sessionIds = selectedSessionIdsByRoutineDayExerciseId.get(meta.routineDayExerciseId) ?? new Set<string>();
      sessionIds.add(meta.sessionId);
      selectedSessionIdsByRoutineDayExerciseId.set(meta.routineDayExerciseId, sessionIds);
      continue;
    }

    addToMapArray(fallbackRowsByExerciseId, meta.exerciseId, historyRow);
    const sessionIds = fallbackSessionIdsByExerciseId.get(meta.exerciseId) ?? new Set<string>();
    sessionIds.add(meta.sessionId);
    fallbackSessionIdsByExerciseId.set(meta.exerciseId, sessionIds);
  }

  function resolveHistoryBucket(exercise: RoutineDayExerciseRow): AuditHistoryBucket {
    const directRows = directRowsByRoutineDayExerciseId.get(exercise.id) ?? [];
    const directSessionIds = selectedSessionIdsByRoutineDayExerciseId.get(exercise.id) ?? new Set<string>();
    const fallbackRows = fallbackRowsByExerciseId.get(exercise.exercise_id) ?? [];
    const fallbackSessionIds = fallbackSessionIdsByExerciseId.get(exercise.exercise_id) ?? new Set<string>();
    const isUniqueCatalogExercise = (routineExerciseCountByCatalogExerciseId.get(exercise.exercise_id) ?? 0) === 1;
    const targetFingerprint = targetFingerprintByRoutineExerciseId.get(exercise.id) ?? "";
    const linkedRoutineExerciseIds = (routineExerciseIdsByFingerprint.get(targetFingerprint) ?? []).filter((id) => id !== exercise.id);
    const linkedRows = linkedRoutineExerciseIds.flatMap((id) => directRowsByRoutineDayExerciseId.get(id) ?? []);
    const linkedSessionIds = new Set(linkedRows.map((row) => row.sessionId));
    const globalRows = globalRowsByExerciseId.get(exercise.exercise_id) ?? [];
    const globalSessionIds = globalSessionIdsByExerciseId.get(exercise.exercise_id) ?? new Set<string>();

    if (directRows.length > 0) {
      return {
        source: "routine_day_exercise_id",
        selectedRows: directRows,
        selectedSessionIds: directSessionIds,
        skippedCount: skippedByRoutineDayExerciseId.get(exercise.id) ?? 0,
        latestCompletedSessionDate: latestDateFromRows(directRows),
        blockedFallbackSetCount: 0,
        blockedFallbackSessionCount: 0,
      };
    }

    if (fallbackRows.length > 0 && isUniqueCatalogExercise) {
      return {
        source: "unique_catalog_exercise_id_fallback",
        selectedRows: fallbackRows,
        selectedSessionIds: fallbackSessionIds,
        skippedCount: skippedFallbackByExerciseId.get(exercise.exercise_id) ?? 0,
        latestCompletedSessionDate: latestDateFromRows(fallbackRows),
        blockedFallbackSetCount: 0,
        blockedFallbackSessionCount: 0,
      };
    }

    if (fallbackRows.length > 0 && !isUniqueCatalogExercise) {
      return {
        source: "blocked_duplicate_catalog_fallback",
        selectedRows: fallbackRows,
        selectedSessionIds: fallbackSessionIds,
        skippedCount: skippedFallbackByExerciseId.get(exercise.exercise_id) ?? 0,
        latestCompletedSessionDate: latestDateFromRows(fallbackRows),
        blockedFallbackSetCount: fallbackRows.length,
        blockedFallbackSessionCount: fallbackSessionIds.size,
      };
    }

    if (linkedRows.length > 0) {
      return {
        source: "linked_same_fingerprint",
        selectedRows: linkedRows,
        selectedSessionIds: linkedSessionIds,
        skippedCount: 0,
        latestCompletedSessionDate: latestDateFromRows(linkedRows),
        blockedFallbackSetCount: 0,
        blockedFallbackSessionCount: 0,
      };
    }

    if (globalRows.length > 0) {
      return {
        source: "global_exercise_context",
        selectedRows: globalRows,
        selectedSessionIds: globalSessionIds,
        skippedCount: 0,
        latestCompletedSessionDate: latestDateFromRows(globalRows),
        blockedFallbackSetCount: 0,
        blockedFallbackSessionCount: 0,
      };
    }

    return {
      source: "none",
      selectedRows: [],
      selectedSessionIds: new Set<string>(),
      skippedCount: (skippedByRoutineDayExerciseId.get(exercise.id) ?? 0) + (skippedFallbackByExerciseId.get(exercise.exercise_id) ?? 0),
      latestCompletedSessionDate: null,
      blockedFallbackSetCount: 0,
      blockedFallbackSessionCount: 0,
    };
  }

  const fallbackWeightUnit = routine.weight_unit === "kg" ? "kg" : "lbs";
  const targetFingerprintByRoutineExerciseId = new Map<string, string>();
  const routineExerciseIdsByFingerprint = new Map<string, string[]>();

  for (const exercise of routineExercises) {
    const plan = buildProgressionReviewTargetPlan(exercise);
    const selection = validateProgressionPlaybookSelection({
      playbookId: exercise.progression_playbook_id,
      config: exercise.progression_playbook_config,
    });
    const targetFingerprint = getProgressionTargetFingerprint({
      exerciseId: exercise.exercise_id,
      target: plan,
      progressionMethod: selection ? normalizeProgressionMethodLayerId(selection.id) : "manual",
      progressionStep: selection?.config.loadIncrement ?? null,
      setFlow: selection?.config.setFlow ?? "straight_sets",
      regressionPolicy: selection && "stallPolicy" in selection.config ? selection.config.stallPolicy : "none",
    });
    targetFingerprintByRoutineExerciseId.set(exercise.id, targetFingerprint);
    const group = routineExerciseIdsByFingerprint.get(targetFingerprint) ?? [];
    group.push(exercise.id);
    routineExerciseIdsByFingerprint.set(targetFingerprint, group);
  }

  const rows = routineExercises
    .map((exercise) => {
      const day = dayById.get(exercise.routine_day_id);
      const exerciseMeta = exerciseById.get(exercise.exercise_id);
      const plan = buildProgressionReviewTargetPlan(exercise);
      const selection = validateProgressionPlaybookSelection({
        playbookId: exercise.progression_playbook_id,
        config: exercise.progression_playbook_config,
      });
      const historyBucket = resolveHistoryBucket(exercise);
      const candidateHistoryRows = historyBucket.source === "routine_day_exercise_id" || historyBucket.source === "unique_catalog_exercise_id_fallback"
        ? historyBucket.selectedRows
        : [];
      const candidateSessionIds = historyBucket.source === "routine_day_exercise_id" || historyBucket.source === "unique_catalog_exercise_id_fallback"
        ? historyBucket.selectedSessionIds
        : new Set<string>();
      const history = buildProgressionHistorySessions({
        rows: candidateHistoryRows,
        targetSetCount: exercise.target_sets,
        topRepTarget: resolveRoutineExerciseRepTarget(exercise),
        limit: 8,
      });
      const progressionStepPolicy = inferProgressionStepPolicy({
        measurementType: plan.measurementType,
        equipment: exerciseMeta?.equipment ?? null,
        movementPattern: exerciseMeta?.movement_pattern ?? null,
        defaultUnit: exercise.default_unit ?? exerciseMeta?.default_unit ?? null,
        weightUnit: plan.weightUnit ?? fallbackWeightUnit,
        distanceUnit: plan.distanceUnit === "km" ? "km" : "mi",
        targetWeight: plan.weightMax ?? plan.weightMin ?? null,
        progressionMethod: selection ? normalizeProgressionMethodLayerId(selection.id) : "manual",
        exerciseOverrideValue: selection?.config.loadIncrement ?? null,
        stepOverrides: selection?.config.stepOverrides ?? null,
      });
      const candidate = deriveProgressionReviewCandidate({
        playbookId: exercise.progression_playbook_id,
        config: exercise.progression_playbook_config,
        plan,
        history,
        historyRows: candidateHistoryRows,
        fallbackWeightUnit,
        progressionStepPolicy,
      });
      const rejectionReason = inferProgressionAuditRejectionReason({
        candidate,
        hasConfiguredPlaybook: Boolean(exercise.progression_playbook_id),
        hasValidSelection: selection !== null,
        historySource: historyBucket.source,
        completedSetCount: historyBucket.selectedRows.length,
        completedSessionCount: historyBucket.selectedSessionIds.size || candidateSessionIds.size,
        measurementType: plan.measurementType,
        reviewWindowEnforced: false,
      });
      const setFlow = selection?.config.setFlow ?? "straight_sets";
      const regressionPolicy = selection && "stallPolicy" in selection.config ? selection.config.stallPolicy : (selection?.id === "deload_after_stall" ? "deload_after_stall" : "none");
      const progressionMethodLayer = selection ? normalizeProgressionMethodLayerId(selection.id) : "manual";
      const progressionVector = resolveProgressionVectorForPlan({
        plan,
        progressionMethod: progressionMethodLayer,
      });
      const qualificationPolicy = resolveProgressionQualificationPolicy({
        measurementType: plan.measurementType,
        progressionMethod: progressionMethodLayer,
      });
      const targetFingerprint = targetFingerprintByRoutineExerciseId.get(exercise.id) ?? "";
      const linkedMatchCount = routineExerciseIdsByFingerprint.get(targetFingerprint)?.length ?? 1;
      const evaluationFingerprint = getProgressionEvaluationFingerprint({
        routineDayExerciseId: exercise.id,
        targetFingerprint,
        progressionConfigFingerprint: exercise.progression_playbook_config,
        historySource: toProgressionHistoryScopeTier(historyBucket.source),
        latestCompletedSessionTimestamp: historyBucket.latestCompletedSessionDate,
        completedSetCount: historyBucket.selectedRows.length,
      });
      const linkedContextSetCount = (routineExerciseIdsByFingerprint.get(targetFingerprint) ?? [])
        .filter((id) => id !== exercise.id)
        .flatMap((id) => directRowsByRoutineDayExerciseId.get(id) ?? [])
        .length;
      const statusItem = formatProgressionStatusDisplayItem({
        id: exercise.id,
        exerciseName: exerciseMeta?.name ?? "Exercise",
        dayName: day?.name ?? null,
        dayGroupId: exercise.routine_day_id,
        candidate,
        rejectionReason,
        historySource: historyBucket.source,
        linkedMatchCount,
        historyRows: historyBucket.selectedRows,
        plan,
      });

      return {
        routineName: routine.name,
        dayName: day?.name ?? `Day ${day?.day_index ?? "?"}`,
        dayIndex: day?.day_index ?? 0,
        routineDayExerciseId: exercise.id,
        exerciseId: exercise.exercise_id,
        exerciseName: exerciseMeta?.name ?? "Exercise",
        measurementType: plan.measurementType,
        equipment: exerciseMeta?.equipment ?? null,
        movementPattern: exerciseMeta?.movement_pattern ?? null,
        progressionMethod: getProgressionMethodLabel(selection?.id ?? null),
        regressionPolicy: getRegressionPolicyLabel(regressionPolicy),
        setFlow: getSetFlowLabel(setFlow),
        progressionStepPolicy,
        progressionVector: getProgressionVectorLabel(progressionVector),
        qualificationPolicy: getProgressionQualificationPolicyLabel(qualificationPolicy),
        target: plan,
        targetSets: exercise.target_sets ?? null,
        targetRepsMin: exercise.target_reps_min ?? exercise.target_reps ?? null,
        targetRepsMax: exercise.target_reps_max ?? exercise.target_reps ?? null,
        targetWeight: exercise.target_weight ?? null,
        targetWeightUnit: exercise.target_weight_unit ?? null,
        targetDurationSeconds: exercise.target_duration_seconds ?? null,
        targetDistance: exercise.target_distance ?? null,
        targetDistanceUnit: exercise.target_distance_unit ?? null,
        targetCalories: exercise.target_calories ?? null,
        historySource: historyBucket.source,
        completedSetCount: historyBucket.selectedRows.length,
        completedSessionCount: historyBucket.selectedSessionIds.size,
        plannedRowSetCount: directRowsByRoutineDayExerciseId.get(exercise.id)?.length ?? 0,
        linkedContextSetCount,
        globalExerciseSetCount: globalRowsByExerciseId.get(exercise.exercise_id)?.length ?? 0,
        skippedCount: historyBucket.skippedCount,
        latestCompletedSessionDate: historyBucket.latestCompletedSessionDate,
        bestSetSummary: formatSetSummary(historyBucket.selectedRows, plan.measurementType),
        reviewWindowStatus: "Not enforced by Today loader; all completed active-routine history is considered.",
        candidateType: candidate.type,
        proposedTarget: formatProgressionReviewTargetLabel(candidate.proposedTarget),
        currentTarget: formatProgressionReviewTargetLabel(candidate.currentTarget),
        reason: candidate.reason,
        rejectionReason,
        blockedFallbackSetCount: historyBucket.blockedFallbackSetCount,
        blockedFallbackSessionCount: historyBucket.blockedFallbackSessionCount,
        targetFingerprint,
        linkedMatchCount,
        evaluationFingerprint,
        candidateSourceSessionDate: candidate.sourceSession?.performedAt ?? null,
        candidateSourceIsLatest: candidate.sourceSession?.isLatest ?? null,
        userFacingStatusLabel: candidate.type === "none" ? (statusItem?.label ?? "Hidden") : "Ready Update",
      } satisfies AuditRow;
    })
    .sort((a, b) => a.dayIndex - b.dayIndex || a.exerciseName.localeCompare(b.exerciseName));

  return {
    activeRoutineId,
    routine,
    rows,
  };
}

export default async function DevProgressionAuditPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const target = getSupabaseTargetDiagnostic();
  const audit = await buildAuditRows();
  const candidateCount = audit.rows.filter((row) => row.candidateType !== "none").length;
  const blockedFallbackCount = audit.rows.filter((row) => row.historySource === "blocked_duplicate_catalog_fallback").length;

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg-app))] px-4 py-8 text-[rgb(var(--text-primary))]">
      <section className="mx-auto max-w-[1120px] space-y-5">
        <header className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.22)] px-5 py-5 text-center shadow-[0_18px_40px_rgb(0_0_0/0.16)] backdrop-blur-[10px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-divider-rgb)/0.9)]">Dev Only</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Progression Candidate Audit</h1>
          <p className="mx-auto mt-3 max-w-[720px] text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
            Read-only audit for the active routine. This lists every planned exercise, the history source Today can use, and the exact
            promote/review/deload/none result without changing Progression Updates behavior.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Field label="Supabase Target" value={target.host ?? "Missing"} />
          <Field label="Expected Target" value={target.expectedHost} />
          <Field label="Active Routine" value={audit.routine?.name ?? "None"} />
          <Field label="Candidates" value={`${candidateCount} ready / ${audit.rows.length} planned`} />
        </section>

        {target.matchesExpected ? null : (
          <section className="rounded-[1.25rem] border border-red-400/32 bg-red-950/18 px-4 py-3 text-sm text-red-100">
            Supabase target does not match the expected LPS project. Audit output may not match your manual LLEL data.
          </section>
        )}

        <section className="rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-1-rgb)/0.18)] px-4 py-3 text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
          <strong className="text-[rgb(var(--text-primary)/0.96)]">Safety:</strong> this route performs no writes. It mirrors Today&apos;s history-source rule:
          direct routine-day exercise history first, unique catalog fallback second, and duplicate catalog fallback blocked.
          {blockedFallbackCount > 0 ? <span className="text-[rgb(var(--accent-warning)/0.96)]"> {blockedFallbackCount} row(s) have blocked duplicate fallback.</span> : null}
        </section>

        {audit.rows.length === 0 ? (
          <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.2)] px-5 py-8 text-center">
            <h2 className="text-lg font-semibold">No planned routine exercises found.</h2>
            <p className="mt-2 text-sm text-[rgb(var(--text-secondary)/0.9)]">
              Select an active routine or add exercises before running the progression audit.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {audit.rows.map((row) => (
              <AuditCard key={row.routineDayExerciseId} row={row} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
