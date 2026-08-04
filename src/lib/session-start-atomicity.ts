import type { PostgrestError } from "@supabase/supabase-js";

// Kept free of @/lib/auth (or other Next.js request-scoped) imports so this
// adapter is directly unit-testable outside the Next.js runtime.
//
// Called from src/lib/start-session.ts via src/lib/session-start-activation.ts.
// This PR's own source is safe to merge at any time -- it does not depend on
// the migration having been applied yet -- but the resulting *code path*
// only works once supabase/migrations/20260804000000_session_start_atomicity_v1.sql
// has actually been applied to the live database. See docs/PLAYBOOK_NOTES.md
// (2026-08-04 entries) and this wave's provider packet for the exact
// apply-then-merge sequencing this activation PR must be gated on.

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

export type SessionStartFromDayRpcClient = {
  rpc(
    name: "start_session_from_day_v1",
    args: {
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

export type SessionStartFromDayResultV1 =
  | { ok: true; outcome: "created" | "existing"; sessionId: string; exerciseCount: number | null }
  | { ok: false; error: string };

const SESSION_START_RESPONSE_SCHEMA_VERSION = "fitness.session-start-response.v1" as const;

function isValidSessionStartResponse(data: unknown): data is {
  schemaVersion: string;
  outcome: "created" | "existing";
  sessionId: string;
  exerciseCount: number | null;
} {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const candidate = data as Record<string, unknown>;

  return (
    candidate.schemaVersion === SESSION_START_RESPONSE_SCHEMA_VERSION &&
    (candidate.outcome === "created" || candidate.outcome === "existing") &&
    typeof candidate.sessionId === "string" &&
    candidate.sessionId.length > 0 &&
    (candidate.exerciseCount === null || typeof candidate.exerciseCount === "number")
  );
}

// Every field the RPC needs to authoritatively create (or idempotently
// return) a session is either derived server-side inside the function itself
// (session id, user id via auth.uid()) or passed through unchanged from
// values start-session.ts already computed today (routine/day display names,
// the already-filtered runnable-exercise list) -- no exercise-selection or
// goal-column business logic is duplicated in SQL.
export async function startSessionFromDayAtomicV1(args: {
  supabase: SessionStartFromDayRpcClient;
  routineId: string;
  dayId: string;
  routineName: string;
  routineDayName: string;
  exercises: SessionStartExerciseIntentV1[];
}): Promise<SessionStartFromDayResultV1> {
  let result: Awaited<ReturnType<SessionStartFromDayRpcClient["rpc"]>>;

  try {
    result = await args.supabase.rpc("start_session_from_day_v1", {
      p_routine_id: args.routineId,
      p_day_id: args.dayId,
      p_routine_name: args.routineName,
      p_routine_day_name: args.routineDayName,
      p_exercises: args.exercises,
    });
  } catch {
    return { ok: false, error: "Could not start workout for this day." };
  }

  if (result.error) {
    return { ok: false, error: "Could not start workout for this day." };
  }

  if (!isValidSessionStartResponse(result.data)) {
    return { ok: false, error: "Could not start workout for this day." };
  }

  return {
    ok: true,
    outcome: result.data.outcome,
    sessionId: result.data.sessionId,
    exerciseCount: result.data.exerciseCount,
  };
}
