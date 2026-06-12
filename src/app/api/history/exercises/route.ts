import { NextResponse } from "next/server";
import { getExerciseBrowserRowsForUserFilter } from "@/lib/exercises-browser";
import { normalizeExerciseInfoFilterState } from "@/lib/exercise-info-scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterState = normalizeExerciseInfoFilterState({
      analyticsScope: searchParams.get("scope"),
      routineId: searchParams.get("routineId"),
      cycleStartDate: searchParams.get("cycleStartDate"),
    });

    const rows = await getExerciseBrowserRowsForUserFilter(filterState);
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown history exercise filter error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
