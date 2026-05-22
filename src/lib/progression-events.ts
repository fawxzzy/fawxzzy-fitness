import type { ProgressionTargetPlan, ProgressionPlaybookSelection } from "@/lib/progression-playbooks";
import { normalizeProgressionMethodLayerId, validateProgressionPlaybookSelection } from "@/lib/progression-playbooks";
import { resolveProgressionVectorForPlan, type ProgressionVectorId } from "@/lib/progression-vector";
import type { supabaseServer } from "@/lib/supabase/server";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";

export const PROGRESSION_EVENT_TYPES = [
  "promotion_applied",
  "promotion_reverted",
  "lock_in",
  "deload_applied",
  "review_acknowledged",
  "manual_target_change",
] as const;

export type ProgressionEventType = (typeof PROGRESSION_EVENT_TYPES)[number];

export type ProgressionEventTargetSnapshot = {
  measurementType: ProgressionTargetPlan["measurementType"];
  setsMin: number | null;
  setsMax: number | null;
  repsTarget: number | null;
  repsMin: number | null;
  repsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
  weightUnit: "lbs" | "kg" | null;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
};

export type ProgressionEventStepSnapshot = {
  vector: ProgressionVectorId;
  loadDelta: number | null;
  repsTargetDelta: number | null;
  repsMinDelta: number | null;
  repsMaxDelta: number | null;
  setsDelta: number | null;
  durationSecondsDelta: number | null;
  distanceDelta: number | null;
  caloriesDelta: number | null;
};

export type ProgressionEventPayload = {
  user_id: string;
  routine_id: string;
  routine_day_exercise_id: string;
  exercise_id: string;
  event_type: ProgressionEventType;
  from_target: ProgressionEventTargetSnapshot;
  to_target: ProgressionEventTargetSnapshot;
  method: string;
  vector: ProgressionVectorId;
  step: ProgressionEventStepSnapshot;
  reason: string;
  source_session_id: string | null;
};

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundedDelta(nextValue: number | null, previousValue: number | null) {
  if (nextValue === null || previousValue === null) {
    return null;
  }

  return Number((nextValue - previousValue).toFixed(3));
}

function resolveSetsValue(target: ProgressionEventTargetSnapshot) {
  return target.setsMax ?? target.setsMin;
}

function resolveWeightValue(target: ProgressionEventTargetSnapshot) {
  return target.weightMax ?? target.weightMin;
}

function buildSelection(args: {
  playbookId?: unknown;
  config?: unknown;
}): ProgressionPlaybookSelection | null {
  return validateProgressionPlaybookSelection({
    playbookId: args.playbookId,
    config: args.config,
  });
}

function inferVectorFromTargetDelta(args: {
  fromTarget: ProgressionTargetPlan;
  toTarget: ProgressionTargetPlan;
}) {
  const fromWeight = normalizeNumber(args.fromTarget.weightMax ?? args.fromTarget.weightMin ?? null);
  const toWeight = normalizeNumber(args.toTarget.weightMax ?? args.toTarget.weightMin ?? null);
  const fromRepsMin = normalizeNumber(args.fromTarget.repsMin ?? null);
  const toRepsMin = normalizeNumber(args.toTarget.repsMin ?? null);
  const fromRepsMax = normalizeNumber(args.fromTarget.repsMax ?? null);
  const toRepsMax = normalizeNumber(args.toTarget.repsMax ?? null);
  const fromDuration = normalizeNumber(args.fromTarget.durationSeconds ?? null);
  const toDuration = normalizeNumber(args.toTarget.durationSeconds ?? null);
  const fromDistance = normalizeNumber(args.fromTarget.distance ?? null);
  const toDistance = normalizeNumber(args.toTarget.distance ?? null);

  const weightChanged = fromWeight !== toWeight;
  const repsChanged = fromRepsMin !== toRepsMin || fromRepsMax !== toRepsMax;
  const durationChanged = fromDuration !== toDuration;
  const distanceChanged = fromDistance !== toDistance;

  if (weightChanged && repsChanged) {
    return "coupled_load_reps" as const;
  }

  if (durationChanged && distanceChanged) {
    return "coupled_duration_distance" as const;
  }

  if (weightChanged) {
    return "load" as const;
  }

  if (repsChanged) {
    return "reps" as const;
  }

  if (durationChanged) {
    return "duration" as const;
  }

  if (distanceChanged) {
    return "distance" as const;
  }

  return "none" as const;
}

export function serializeProgressionEventTarget(plan: ProgressionTargetPlan): ProgressionEventTargetSnapshot {
  return {
    measurementType: plan.measurementType,
    setsMin: normalizeNumber(plan.setsMin),
    setsMax: normalizeNumber(plan.setsMax),
    repsTarget: normalizeNumber(plan.repsTarget),
    repsMin: normalizeNumber(plan.repsMin),
    repsMax: normalizeNumber(plan.repsMax),
    weightMin: normalizeNumber(plan.weightMin),
    weightMax: normalizeNumber(plan.weightMax),
    weightUnit: plan.weightUnit ?? null,
    durationSeconds: normalizeNumber(plan.durationSeconds),
    distance: normalizeNumber(plan.distance),
    distanceUnit: plan.distanceUnit ?? null,
    calories: normalizeNumber(plan.calories),
  };
}

export function targetsDiffer(fromTarget: ProgressionTargetPlan, toTarget: ProgressionTargetPlan) {
  return JSON.stringify(serializeProgressionEventTarget(fromTarget)) !== JSON.stringify(serializeProgressionEventTarget(toTarget));
}

export function buildProgressionEventStepSnapshot(args: {
  fromTarget: ProgressionTargetPlan;
  toTarget: ProgressionTargetPlan;
  vector: ProgressionVectorId;
}): ProgressionEventStepSnapshot {
  const fromSnapshot = serializeProgressionEventTarget(args.fromTarget);
  const toSnapshot = serializeProgressionEventTarget(args.toTarget);
  return {
    vector: args.vector,
    loadDelta: roundedDelta(resolveWeightValue(toSnapshot), resolveWeightValue(fromSnapshot)),
    repsTargetDelta: roundedDelta(toSnapshot.repsTarget, fromSnapshot.repsTarget),
    repsMinDelta: roundedDelta(toSnapshot.repsMin, fromSnapshot.repsMin),
    repsMaxDelta: roundedDelta(toSnapshot.repsMax, fromSnapshot.repsMax),
    setsDelta: roundedDelta(resolveSetsValue(toSnapshot), resolveSetsValue(fromSnapshot)),
    durationSecondsDelta: roundedDelta(toSnapshot.durationSeconds, fromSnapshot.durationSeconds),
    distanceDelta: roundedDelta(toSnapshot.distance, fromSnapshot.distance),
    caloriesDelta: roundedDelta(toSnapshot.calories, fromSnapshot.calories),
  };
}

export function resolveProgressionEventMethod(args: {
  playbookId?: unknown;
  config?: unknown;
}) {
  const selection = buildSelection(args);
  if (!selection) {
    return "manual";
  }

  return normalizeProgressionMethodLayerId(selection.id);
}

export function resolveProgressionEventVector(args: {
  playbookId?: unknown;
  config?: unknown;
  fromTarget: ProgressionTargetPlan;
  toTarget: ProgressionTargetPlan;
}) {
  const method = resolveProgressionEventMethod(args);
  const configuredVector = resolveProgressionVectorForPlan({
    plan: args.toTarget,
    progressionMethod: method,
  });

  if (configuredVector !== "none") {
    return configuredVector;
  }

  return inferVectorFromTargetDelta({
    fromTarget: args.fromTarget,
    toTarget: args.toTarget,
  });
}

export function buildProgressionEventPayload(args: {
  userId: string;
  routineId: string;
  routineDayExerciseId: string;
  exerciseId: string;
  eventType: ProgressionEventType;
  fromTarget: ProgressionTargetPlan;
  toTarget: ProgressionTargetPlan;
  reason: string;
  playbookId?: unknown;
  config?: unknown;
  sourceSessionId?: string | null;
}): ProgressionEventPayload | null {
  if (!args.userId || !args.routineId || !args.routineDayExerciseId || !args.exerciseId || !args.reason.trim()) {
    return null;
  }

  const method = resolveProgressionEventMethod({
    playbookId: args.playbookId,
    config: args.config,
  });
  const vector = resolveProgressionEventVector({
    playbookId: args.playbookId,
    config: args.config,
    fromTarget: args.fromTarget,
    toTarget: args.toTarget,
  });

  return {
    user_id: args.userId,
    routine_id: args.routineId,
    routine_day_exercise_id: args.routineDayExerciseId,
    exercise_id: args.exerciseId,
    event_type: args.eventType,
    from_target: serializeProgressionEventTarget(args.fromTarget),
    to_target: serializeProgressionEventTarget(args.toTarget),
    method,
    vector,
    step: buildProgressionEventStepSnapshot({
      fromTarget: args.fromTarget,
      toTarget: args.toTarget,
      vector,
    }),
    reason: args.reason.trim(),
    source_session_id: args.sourceSessionId ?? null,
  };
}

export function extractProgressionSourceSessionId(args: {
  sourceSessionId?: string | null;
  historyRows: Array<{
    sessionId: string;
    sessionRecordId?: string | null;
  }>;
}) {
  if (!args.sourceSessionId) {
    return null;
  }

  return args.historyRows.find((row) => row.sessionId === args.sourceSessionId)?.sessionRecordId ?? null;
}

export async function recordProgressionEvent(args: {
  supabase: ReturnType<typeof supabaseServer>;
  payload: ProgressionEventPayload | null;
  context: string;
}) {
  if (!args.payload) {
    return { ok: false as const, error: "missing-payload" };
  }

  const { error } = await args.supabase
    .from("progression_events")
    .insert(args.payload);

  if (error) {
    console.error("[progression-events] failed to record event", {
      context: args.context,
      eventType: args.payload.event_type,
      routineDayExerciseId: args.payload.routine_day_exercise_id,
      message: error.message,
    });
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
