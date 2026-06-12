import { NextResponse } from "next/server";
import { getExerciseBrowserRowsForUserFilter } from "@/lib/exercises-browser";
import { isExerciseInfoAnalyticsScope, normalizeExerciseInfoFilterState } from "@/lib/exercise-info-scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedScope = searchParams.get("scope");
    const filterState = normalizeExerciseInfoFilterState({
      analyticsScope: isExerciseInfoAnalyticsScope(requestedScope) ? requestedScope : undefined,
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
