import { NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/api-auth";
import { getExerciseBrowserRowsForUserFilter } from "@/lib/exercises-browser";
import { isExerciseInfoAnalyticsScope, normalizeExerciseInfoFilterState } from "@/lib/exercise-info-scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Outside the try block: a missing session is a 401, not a 500 with the text "NEXT_REDIRECT".
  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedScope = searchParams.get("scope");
    const filterState = normalizeExerciseInfoFilterState({
      analyticsScope: isExerciseInfoAnalyticsScope(requestedScope) ? requestedScope : undefined,
      routineId: searchParams.get("routineId"),
      cycleStartDate: searchParams.get("cycleStartDate"),
    });

    const rows = await getExerciseBrowserRowsForUserFilter(auth.user.id, filterState);
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown history exercise filter error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
