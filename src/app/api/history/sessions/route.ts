import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  loadHistorySessionsScopePayloadForUser,
} from "@/lib/history-sessions-page-loader";
import { normalizeExerciseInfoFilterState } from "@/lib/exercise-info-scope";
import { QA_LLEL_VISIBILITY_COOKIE, resolveQaLlelVisibilityOverride } from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterState = normalizeExerciseInfoFilterState({
      analyticsScope: searchParams.get("scope"),
      routineId: searchParams.get("routineId"),
      cycleStartDate: searchParams.get("cycleStartDate"),
    });
    const user = await requireUser();
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
