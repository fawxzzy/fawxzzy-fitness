import { NextResponse } from "next/server";
import { getExerciseInfoBase, getExerciseInfoStats, resolveExerciseInfoImages } from "@/lib/exercise-info";
import { optionalEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExerciseInfoErrorCode =
  | "EXERCISE_INFO_INVALID_ID"
  | "EXERCISE_INFO_UNAUTHENTICATED"
  | "EXERCISE_INFO_NOT_FOUND"
  | "EXERCISE_INFO_MISCONFIG"
  | "EXERCISE_INFO_UNEXPECTED";

type ExerciseInfoStep = "validate" | "auth" | "payload:base" | "payload:stats" | "payload:images" | "respond";

function jsonError(status: number, code: ExerciseInfoErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...(details ? { details } : {}) }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: { exerciseId: string } },
) {
  const exerciseId = params.exerciseId;
  let step: ExerciseInfoStep = "validate";
  let userId: string | null = null;

  const runStep = async <T>(nextStep: ExerciseInfoStep, fn: () => Promise<T> | T) => {
    step = nextStep;
    try {
      return await fn();
    } catch (error) {
      const resolved = error instanceof Error ? error : new Error(String(error));
      console.error("[api/exercise-info] step failure", {
        path: "/api/exercise-info/[exerciseId]",
        method: request.method,
        exerciseId,
        userId,
        step,
        message: resolved.message,
        stack: resolved.stack,
      });
      throw error;
    }
  };

  const isValidExerciseId = await runStep("validate", () => UUID_V4ISH_PATTERN.test(exerciseId));
  if (!isValidExerciseId) {
    return jsonError(400, "EXERCISE_INFO_INVALID_ID", "Invalid exercise id.");
  }

  try {
    const hasSupabaseEnv = await runStep("validate", () => {
      return Boolean(optionalEnv("NEXT_PUBLIC_SUPABASE_URL") && optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
    });

    if (!hasSupabaseEnv) {
      return jsonError(500, "EXERCISE_INFO_MISCONFIG", "Server misconfigured.");
    }

    const supabase = await runStep("auth", () => supabaseServer());
    const {
      data: { user },
      error: authError,
    } = await runStep("auth", () => supabase.auth.getUser());

    if (authError) {
      const normalizedAuthMessage = authError.message.toLowerCase();
      if (normalizedAuthMessage.includes("auth session missing")) {
        return jsonError(401, "EXERCISE_INFO_UNAUTHENTICATED", "Not signed in.");
      }

      throw new Error(`failed to resolve auth user: ${authError.message}`);
    }

    if (!user) {
      return jsonError(401, "EXERCISE_INFO_UNAUTHENTICATED", "Not signed in.");
    }

    userId = user.id;

    const exercise = await runStep("payload:base", () => getExerciseInfoBase(exerciseId, user.id));

    if (!exercise) {
      return jsonError(404, "EXERCISE_INFO_NOT_FOUND", "Exercise not found.");
    }

    const stats = await runStep("payload:stats", () => getExerciseInfoStats(user.id, exercise.exercise_id));
    const exerciseWithImages = await runStep("payload:images", () => resolveExerciseInfoImages(exercise));

    const payload = { exercise: exerciseWithImages, stats };

    return runStep("respond", () => NextResponse.json({ ok: true, payload }, { status: 200 }));
  } catch (error) {
    const resolved = error instanceof Error ? error : new Error("Unknown exercise info route failure");
    console.error("[api/exercise-info] unexpected failure", {
      path: "/api/exercise-info/[exerciseId]",
      method: request.method,
      exerciseId,
      userId,
      step,
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
