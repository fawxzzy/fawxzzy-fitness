import { NextResponse } from "next/server";
import { getExerciseInfoPayload } from "@/lib/exercise-info";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { exerciseId: string } },
) {
  const exerciseId = params.exerciseId;

  if (!UUID_V4ISH_PATTERN.test(exerciseId)) {
    return jsonError(400, "Invalid exerciseId", "EXERCISE_INFO_INVALID_EXERCISE_ID");
  }

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError(401, "Unauthorized", "EXERCISE_INFO_UNAUTHORIZED");
  }

  try {
    const payload = await getExerciseInfoPayload(user.id, exerciseId);
    if (!payload) {
      return jsonError(404, "Exercise not found", "EXERCISE_INFO_NOT_FOUND");
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/exercise-info] failed to load", { exerciseId, error });
    return jsonError(500, "Failed to load exercise info", "EXERCISE_INFO_INTERNAL_ERROR");
  }
}
