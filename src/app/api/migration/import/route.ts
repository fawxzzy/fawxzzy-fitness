import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { recomputeExerciseStatsForExercises } from "@/lib/exercise-stats";
import {
  importFitnessLegacySnapshot,
  isFitnessLegacySnapshot,
} from "@/lib/migration/fitness-legacy-bridge";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ImportRequest = {
  snapshot?: unknown;
  allowMerge?: boolean;
};

export async function POST(request: Request) {
  let payload: ImportRequest;

  try {
    payload = (await request.json()) as ImportRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  if (!isFitnessLegacySnapshot(payload.snapshot)) {
    return NextResponse.json(
      { ok: false, error: "Expected a fitness-legacy-v1 snapshot payload." },
      { status: 400 },
    );
  }

  try {
    const user = await requireUser();
    const summary = await importFitnessLegacySnapshot({
      admin: supabaseAdmin(),
      newUserId: user.id,
      snapshot: payload.snapshot,
      allowMerge: payload.allowMerge === true,
    });

    if (summary.affectedExerciseIds.length > 0) {
      await recomputeExerciseStatsForExercises(user.id, summary.affectedExerciseIds);
    }

    revalidatePath("/today");
    revalidatePath("/routines");
    revalidatePath("/history");
    revalidatePath("/session");
    revalidatePath("/settings");

    return NextResponse.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to import the legacy snapshot right now.",
      },
      { status: 400 },
    );
  }
}
