import {
  canonicalizeJson,
  digestCanonicalJson,
} from "@/features/curated-onboarding/planning/canonical";
import {
  validateRoutinePersistenceIntentV1WithReceipt,
  type RoutinePersistenceIntentV1,
} from "@/features/curated-onboarding/planning/persistence/contract";
import {
  validateRoutinePersistenceIntentAgainstInputsV1,
} from "@/features/curated-onboarding/planning/persistence/compile";

export const PLANNER_ROUTINE_CREATE_ADAPTER_VERSION =
  "fitness.planner-routine-create-adapter.2026-07-29.v1" as const;
export const PLANNER_ROUTINE_CREATE_RESPONSE_VERSION =
  "fitness.planner-routine-create-response.v1" as const;
export const PLANNER_ROUTINE_CREATE_PROVIDER_ERROR_CODES = {
  returnedError: "PERSISTENCE_PROVIDER_RETURNED_ERROR",
  thrownError: "PERSISTENCE_PROVIDER_THROWN_ERROR",
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type PlannerRoutineCreateProviderContextV1 = {
  name: string;
  startDate: string;
  timezone: string;
};

export type PlannerRoutineCreateExactInputsV1 = {
  planning: unknown;
  catalog: unknown;
  coverage: unknown;
  ranking: unknown;
  selection: unknown;
  allocation: unknown;
  prescription: unknown;
  assembly: unknown;
  request: unknown;
};

export type PlannerRoutineCreateRpcClient = {
  rpc(
    name: "create_planner_routine_v1",
    args: {
      p_intent: RoutinePersistenceIntentV1;
      p_name: string;
      p_start_date: string;
      p_timezone: string;
    },
  ): Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

export type PlannerRoutineCreateProjectionV1 = {
  routine: {
    plannerRecordId: string;
    userId: string;
    name: string;
    cycleLengthDays: number;
    scheduleMode: "weekday_anchored" | "rolling_n_day";
    startDate: string;
    timezone: string;
    generationRequestId: string;
    uniquenessKey: string;
    intentDigest: string;
    assemblyDigest: string;
    routineDigest: string;
    activationState: "not_requested";
  };
  sessions: Array<{
    plannerRecordId: string;
    routineRecordId: string;
    sessionId: string;
    ordinal: number;
    dayIndex: number;
    weekday: string | null;
    timeBudget: unknown;
    exerciseRecordIds: string[];
  }>;
  exercises: Array<{
    plannerRecordId: string;
    routineRecordId: string;
    sessionRecordId: string;
    sessionId: string;
    exerciseSlug: string;
    position: number;
    measurementType: "reps" | "time" | "time_distance";
    targetSets: number;
    targetRepsMin: number | null;
    targetRepsMax: number | null;
    targetDurationSeconds: number | null;
    prescription: unknown;
    rankingExplanation: unknown;
    substitutionRules: unknown[];
    warmup: null;
  }>;
};

export type PlannerRoutineCreateResponseV1 = {
  schemaVersion: typeof PLANNER_ROUTINE_CREATE_RESPONSE_VERSION;
  outcome: "created" | "replayed";
  routineId: string;
  userId: string;
  generationRequestId: string;
  uniquenessKey: string;
  intentDigest: string;
  activationMutation: false;
  persistedIntent: RoutinePersistenceIntentV1;
  rows: PlannerRoutineCreateProjectionV1;
};

export type PlannerRoutineCreateReceiptV1 = {
  adapterVersion: typeof PLANNER_ROUTINE_CREATE_ADAPTER_VERSION;
  intentDigest: string | null;
  attempted: boolean;
  valid: boolean;
  outcome: "created" | "replayed" | "not_attempted" | "provider_error";
  routineId: string | null;
  responseDigest: string | null;
  errors: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length
    && actual.every((key, index) => key === keys[index]);
}

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validateProviderContext(
  value: unknown,
) {
  const errors: string[] = [];
  const root = asRecord(value);
  if (!root) {
    return {
      context: null,
      errors: ["$.providerContext must be a record."],
    };
  }
  if (
    typeof root.name !== "string"
    || root.name.length < 1
    || root.name.length > 120
    || root.name.trim() !== root.name
  ) {
    errors.push(
      "$.providerContext.name must be a trimmed string from 1 through 120 characters.",
    );
  }
  if (typeof root.startDate !== "string" || !isValidDate(root.startDate)) {
    errors.push(
      "$.providerContext.startDate must be a real YYYY-MM-DD calendar date.",
    );
  }
  if (
    typeof root.timezone !== "string"
    || root.timezone.length > 100
    || !isValidTimezone(root.timezone)
  ) {
    errors.push(
      "$.providerContext.timezone must be a supported IANA time zone.",
    );
  }
  return {
    context: errors.length === 0
      ? {
        name: root.name as string,
        startDate: root.startDate as string,
        timezone: root.timezone as string,
      }
      : null,
    errors,
  };
}

export function buildPlannerRoutineCreateProjectionV1(
  intent: RoutinePersistenceIntentV1,
  providerContext: PlannerRoutineCreateProviderContextV1,
): PlannerRoutineCreateProjectionV1 {
  if (intent.status !== "ready_to_create" || !intent.creation) {
    throw new TypeError("A ready-to-create persistence intent is required.");
  }
  const { records } = intent.creation;
  const scheduleMode = records.routine.schedule.dayConstraint === "fixed"
    ? "weekday_anchored"
    : "rolling_n_day";
  return {
    routine: {
      plannerRecordId: records.routine.recordId,
      userId: records.routine.userId,
      name: providerContext.name,
      cycleLengthDays: records.sessions.length,
      scheduleMode,
      startDate: providerContext.startDate,
      timezone: providerContext.timezone,
      generationRequestId: records.routine.generationRequestId,
      uniquenessKey: records.routine.uniquenessKey,
      intentDigest: intent.intentDigest,
      assemblyDigest: records.routine.assemblyDigest,
      routineDigest: records.routine.routineDigest,
      activationState: "not_requested",
    },
    sessions: records.sessions.map((session) => ({
      plannerRecordId: session.recordId,
      routineRecordId: session.routineRecordId,
      sessionId: session.sessionId,
      ordinal: session.ordinal,
      dayIndex: session.ordinal,
      weekday: session.weekday,
      timeBudget: structuredClone(session.timeBudget),
      exerciseRecordIds: [...session.exerciseRecordIds],
    })),
    exercises: records.exercises.map((exercise) => ({
      plannerRecordId: exercise.recordId,
      routineRecordId: exercise.routineRecordId,
      sessionRecordId: exercise.sessionRecordId,
      sessionId: exercise.sessionId,
      exerciseSlug: exercise.prescription.exerciseId,
      position: exercise.prescription.sessionExercisePosition - 1,
      measurementType: exercise.prescription.measurementType,
      targetSets: exercise.prescription.sets,
      targetRepsMin: exercise.prescription.measurementType === "reps"
        ? exercise.prescription.target.minimum
        : null,
      targetRepsMax: exercise.prescription.measurementType === "reps"
        ? exercise.prescription.target.maximum
        : null,
      targetDurationSeconds:
        exercise.prescription.measurementType === "time"
          ? exercise.prescription.target.maximum
          : exercise.prescription.measurementType === "time_distance"
            ? exercise.prescription.target.maximum * 60
            : null,
      prescription: structuredClone(exercise.prescription),
      rankingExplanation: structuredClone(exercise.rankingExplanation),
      substitutionRules: structuredClone(exercise.substitutionRules),
      warmup: null,
    })),
  };
}

function validateResponse(
  value: unknown,
  intent: RoutinePersistenceIntentV1,
  providerContext: PlannerRoutineCreateProviderContextV1,
) {
  const errors: string[] = [];
  const root = asRecord(value);
  if (!root) return ["$.response must be a record."];
  if (!hasExactKeys(root, [
    "activationMutation",
    "generationRequestId",
    "intentDigest",
    "outcome",
    "persistedIntent",
    "routineId",
    "rows",
    "schemaVersion",
    "uniquenessKey",
    "userId",
  ])) {
    errors.push("$.response must contain exactly the adapter response keys.");
  }
  if (root.schemaVersion !== PLANNER_ROUTINE_CREATE_RESPONSE_VERSION) {
    errors.push("$.response.schemaVersion is unsupported.");
  }
  if (root.outcome !== "created" && root.outcome !== "replayed") {
    errors.push("$.response.outcome must be created or replayed.");
  }
  if (typeof root.routineId !== "string" || !UUID_PATTERN.test(root.routineId)) {
    errors.push("$.response.routineId must be a UUID.");
  }
  if (root.userId !== intent.request.userId) {
    errors.push("$.response.userId does not match the authenticated intent.");
  }
  if (root.generationRequestId !== intent.request.generationRequestId) {
    errors.push("$.response.generationRequestId does not match the intent.");
  }
  if (root.uniquenessKey !== intent.request.uniquenessKey) {
    errors.push("$.response.uniquenessKey does not match the intent.");
  }
  if (root.intentDigest !== intent.intentDigest) {
    errors.push("$.response.intentDigest does not match the intent.");
  }
  if (root.activationMutation !== false) {
    errors.push("$.response.activationMutation must remain false.");
  }
  try {
    if (canonicalizeJson(root.persistedIntent) !== canonicalizeJson(intent)) {
      errors.push(
        "$.response.persistedIntent does not exactly round-trip the validated intent.",
      );
    }
  } catch {
    errors.push("$.response.persistedIntent is not canonical JSON.");
  }
  try {
    const expectedRows = buildPlannerRoutineCreateProjectionV1(
      intent,
      providerContext,
    );
    if (canonicalizeJson(root.rows) !== canonicalizeJson(expectedRows)) {
      errors.push(
        "$.response.rows do not exactly round-trip the expected persisted record projection.",
      );
    }
  } catch {
    errors.push("$.response.rows could not be validated.");
  }
  return errors;
}

function baseReceipt(
  intentDigest: string | null,
): PlannerRoutineCreateReceiptV1 {
  return {
    adapterVersion: PLANNER_ROUTINE_CREATE_ADAPTER_VERSION,
    intentDigest,
    attempted: false,
    valid: false,
    outcome: "not_attempted",
    routineId: null,
    responseDigest: null,
    errors: [],
  };
}

export async function createPlannerRoutineFromIntentV1(args: {
  authenticatedUserId: string;
  intent: unknown;
  exactInputs: PlannerRoutineCreateExactInputsV1;
  providerContext: unknown;
  supabase: PlannerRoutineCreateRpcClient;
}): Promise<PlannerRoutineCreateReceiptV1> {
  const runtimeReceipt =
    validateRoutinePersistenceIntentV1WithReceipt(args.intent);
  const receipt = baseReceipt(runtimeReceipt.intentDigest);
  const errors = [...runtimeReceipt.errors];
  if (!runtimeReceipt.valid) {
    return { ...receipt, errors };
  }

  const intent = args.intent as RoutinePersistenceIntentV1;
  errors.push(...validateRoutinePersistenceIntentAgainstInputsV1(
    intent,
    args.exactInputs.planning,
    args.exactInputs.catalog,
    args.exactInputs.coverage,
    args.exactInputs.ranking,
    args.exactInputs.selection,
    args.exactInputs.allocation,
    args.exactInputs.prescription,
    args.exactInputs.assembly,
    args.exactInputs.request,
  ));
  if (intent.status !== "ready_to_create" || !intent.creation) {
    errors.push("$.intent must be ready_to_create before persistence.");
  }
  if (
    typeof args.authenticatedUserId !== "string"
    || args.authenticatedUserId.length === 0
    || args.authenticatedUserId !== intent.request.userId
  ) {
    errors.push(
      "$.authenticatedUserId must exactly match the validated intent userId.",
    );
  }
  const providerContextValidation = validateProviderContext(
    args.providerContext,
  );
  errors.push(...providerContextValidation.errors);
  const providerContext = providerContextValidation.context;
  if (errors.length > 0 || !providerContext) {
    return { ...receipt, errors: [...new Set(errors)] };
  }

  let result: Awaited<ReturnType<PlannerRoutineCreateRpcClient["rpc"]>>;
  try {
    result = await args.supabase.rpc("create_planner_routine_v1", {
      p_intent: intent,
      p_name: providerContext.name,
      p_start_date: providerContext.startDate,
      p_timezone: providerContext.timezone,
    });
  } catch {
    return {
      ...receipt,
      attempted: true,
      outcome: "provider_error",
      errors: [PLANNER_ROUTINE_CREATE_PROVIDER_ERROR_CODES.thrownError],
    };
  }
  if (result.error) {
    return {
      ...receipt,
      attempted: true,
      outcome: "provider_error",
      errors: [PLANNER_ROUTINE_CREATE_PROVIDER_ERROR_CODES.returnedError],
    };
  }

  const responseErrors = validateResponse(
    result.data,
    intent,
    providerContext,
  );
  const response = asRecord(result.data);
  if (responseErrors.length > 0 || !response) {
    return {
      ...receipt,
      attempted: true,
      errors: responseErrors,
    };
  }
  return {
    adapterVersion: PLANNER_ROUTINE_CREATE_ADAPTER_VERSION,
    intentDigest: intent.intentDigest,
    attempted: true,
    valid: true,
    outcome: response.outcome as "created" | "replayed",
    routineId: response.routineId as string,
    responseDigest: digestCanonicalJson(response),
    errors: [],
  };
}
