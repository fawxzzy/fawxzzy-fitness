import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

export type SessionStartExerciseIntentV1 = {
  exerciseId: string;
  routineDayExerciseId: string;
  position: number;
  measurementType: "reps" | "time" | "distance" | "time_distance" | "none";
  defaultUnit: string | null;
  targetSetsMin: number | null;
  targetSetsMax: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeightMin: number | null;
  targetWeightMax: number | null;
  targetWeightUnit: "lbs" | "kg" | null;
  targetTimeSecondsMin: number | null;
  targetTimeSecondsMax: number | null;
  targetDistanceMin: number | null;
  targetDistanceMax: number | null;
  targetDistanceUnit: string | null;
  targetCaloriesMin: number | null;
  targetCaloriesMax: number | null;
};

type SessionStartFromDayRpcClient = {
  rpc(
    name: "start_session_from_day_v1",
    args: {
      p_authenticated_user_id: string;
      p_routine_id: string;
      p_day_id: string;
      p_routine_name: string;
      p_routine_day_name: string;
      p_exercises: SessionStartExerciseIntentV1[];
    },
  ): Promise<{
    data: unknown;
    error: PostgrestError | { message?: string } | null;
  }>;
};

type SessionStartDependenciesV1 = {
  requireAuthenticatedUser(): Promise<{ id: string }>;
  createServerProviderClient(): Promise<SessionStartFromDayRpcClient>;
};

export type SessionStartFromDayArgsV1 = {
  routineId: string;
  dayId: string;
  routineName: string;
  routineDayName: string;
  exercises: SessionStartExerciseIntentV1[];
};

export type SessionStartFromDayResultV1 =
  | { ok: true; outcome: "created" | "existing"; sessionId: string; exerciseCount: number | null }
  | { ok: false; error: string };

const SESSION_START_RESPONSE_SCHEMA_VERSION = "fitness.session-start-response.v1" as const;
const SESSION_START_ERROR = "Could not start workout for this day.";

const DEFAULT_DEPENDENCIES: SessionStartDependenciesV1 = {
  requireAuthenticatedUser: async () => {
    const { requireUser } = await import("@/lib/auth");
    return await requireUser({
      gate: "session-start-atomicity.require-user",
      route: "/today",
      blockingReason: "Waiting for the authenticated workout owner.",
    });
  },
  createServerProviderClient: async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    return supabaseAdmin() as unknown as SessionStartFromDayRpcClient;
  },
};

function isValidSessionStartResponse(data: unknown): data is {
  schemaVersion: string;
  outcome: "created" | "existing";
  sessionId: string;
  exerciseCount: number | null;
} {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  return candidate.schemaVersion === SESSION_START_RESPONSE_SCHEMA_VERSION
    && (candidate.outcome === "created" || candidate.outcome === "existing")
    && typeof candidate.sessionId === "string"
    && candidate.sessionId.length > 0
    && (candidate.exerciseCount === null || typeof candidate.exerciseCount === "number");
}

async function startSessionFromDayAtomicWithDependenciesV1(
  args: SessionStartFromDayArgsV1,
  dependencies: SessionStartDependenciesV1,
): Promise<SessionStartFromDayResultV1> {
  let user: { id: string };
  try {
    user = await dependencies.requireAuthenticatedUser();
  } catch {
    return { ok: false, error: SESSION_START_ERROR };
  }

  let result: Awaited<ReturnType<SessionStartFromDayRpcClient["rpc"]>>;
  try {
    const supabase = await dependencies.createServerProviderClient();
    result = await supabase.rpc("start_session_from_day_v1", {
      p_authenticated_user_id: user.id,
      p_routine_id: args.routineId,
      p_day_id: args.dayId,
      p_routine_name: args.routineName,
      p_routine_day_name: args.routineDayName,
      p_exercises: args.exercises,
    });
  } catch {
    return { ok: false, error: SESSION_START_ERROR };
  }

  if (result.error || !isValidSessionStartResponse(result.data)) {
    return { ok: false, error: SESSION_START_ERROR };
  }

  return {
    ok: true,
    outcome: result.data.outcome,
    sessionId: result.data.sessionId,
    exerciseCount: result.data.exerciseCount,
  };
}

export async function startSessionFromDayAtomicV1(
  args: SessionStartFromDayArgsV1,
): Promise<SessionStartFromDayResultV1> {
  return await startSessionFromDayAtomicWithDependenciesV1(args, DEFAULT_DEPENDENCIES);
}
