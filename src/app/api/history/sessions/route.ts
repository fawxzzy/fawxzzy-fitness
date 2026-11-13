import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/api-auth";
import {
  loadHistorySessionsScopePayloadForUser,
} from "@/lib/history-sessions-page-loader";
import { isExerciseInfoAnalyticsScope, normalizeExerciseInfoFilterState } from "@/lib/exercise-info-scope";
import { QA_LLEL_VISIBILITY_COOKIE, resolveQaLlelVisibilityOverride } from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Outside the try block: a missing session is a 401, not a 500 with the text "NEXT_REDIRECT".
  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const requestedScope = searchParams.get("scope");
    const filterState = normalizeExerciseInfoFilterState({
      analyticsScope: isExerciseInfoAnalyticsScope(requestedScope) ? requestedScope : undefined,
      routineId: searchParams.get("routineId"),
      cycleStartDate: searchParams.get("cycleStartDate"),
    });
    const payload = await loadHistorySessionsScopePayloadForUser({
      supabase: supabaseServer(),
      userId: user.id,
      filterState,
      showQaLlelDataOverride: resolveQaLlelVisibilityOverride(
        cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value,
      ),
    });

    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown history session filter error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
