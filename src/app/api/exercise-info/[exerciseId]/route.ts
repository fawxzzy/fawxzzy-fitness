import { NextResponse } from "next/server";
import { getExerciseInfoPayload } from "@/lib/exercise-info";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExerciseInfoErrorCode =
  | "EXERCISE_INFO_INVALID_ID"
  | "EXERCISE_INFO_UNAUTHENTICATED"
  | "EXERCISE_INFO_NOT_FOUND"
  | "EXERCISE_INFO_UNEXPECTED";

function jsonError(status: number, code: ExerciseInfoErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...(details ? { details } : {}) }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { exerciseId: string } },
) {
  const exerciseId = params.exerciseId;

  if (!UUID_V4ISH_PATTERN.test(exerciseId)) {
    return jsonError(400, "EXERCISE_INFO_INVALID_ID", "Invalid exercise id.");
  }

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError(401, "EXERCISE_INFO_UNAUTHENTICATED", "Not signed in.");
  }

  try {
    const payload = await getExerciseInfoPayload(exerciseId, user.id);

    if (!payload) {
      return jsonError(404, "EXERCISE_INFO_NOT_FOUND", "Exercise not found.");
    }

    return NextResponse.json({ ok: true, payload }, { status: 200 });
  } catch (error) {
    const resolved = error instanceof Error ? error : new Error("Unknown exercise info route failure");
    console.error("[api/exercise-info] unexpected failure", {
      path: "/api/exercise-info/[exerciseId]",
      exerciseId,
      userId: user.id,
      message: resolved.message,
      stack: resolved.stack,
    });

    return jsonError(
      500,
      "EXERCISE_INFO_UNEXPECTED",
      "Unexpected server error.",
      process.env.NODE_ENV !== "production" ? { stack: resolved.stack } : undefined,
    );
  }
}
