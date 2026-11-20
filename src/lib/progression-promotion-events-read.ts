// One read of the events that decide the Manual Promote hold, shared by the Today loader (all of a
// routine's exercises) and the Promote/Revert actions (one exercise). It pages until the result is
// complete, so "applied and not yet reverted" is computed from the same full event list on both
// sides; a fixed row limit (the loader once read 1000 per routine, the action 50 per exercise)
// could drop an old standing promotion on one side only and make Today and the server disagree.
import type { ManualPromotionEventRow } from "@/lib/progression-manual-promotion";
import type { supabaseServer } from "@/lib/supabase/server";

export const PROMOTION_HOLD_EVENT_TYPES = ["promotion_applied", "promotion_reverted", "deload_applied"] as const;
export const PROMOTION_HOLD_EVENTS_PAGE_SIZE = 1000;
const PROMOTION_HOLD_EVENTS_MAX_PAGES = 50;

export async function readPromotionHoldEvents(args: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  userId: string;
  routineDayExerciseIds: string[];
  /** Tests only. */
  pageSize?: number;
}): Promise<ManualPromotionEventRow[]> {
  if (args.routineDayExerciseIds.length === 0) {
    return [];
  }

  const pageSize = args.pageSize ?? PROMOTION_HOLD_EVENTS_PAGE_SIZE;
  const rows: ManualPromotionEventRow[] = [];
  // PostgREST's max-rows can cap a page below the requested size, so a short page alone does not
  // mean the end. Advance by what actually came back; stop on an empty page, or on a page shorter
  // than one already seen (the server's cap is at least that big, so this one is the tail).
  let largestPage = 0;
  for (let page = 0; page < PROMOTION_HOLD_EVENTS_MAX_PAGES; page += 1) {
    const from = rows.length;
    const { data, error } = await args.supabase
      .from("progression_events")
      .select("event_type, routine_day_exercise_id, source_session_id, created_at")
      .eq("user_id", args.userId)
      .in("routine_day_exercise_id", args.routineDayExerciseIds)
      .in("event_type", [...PROMOTION_HOLD_EVENT_TYPES])
      // Unique tie-break so offset paging never skips or repeats a row.
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error("Could not verify earlier promotions.");
    }

    const batch = (data ?? []) as ManualPromotionEventRow[];
    rows.push(...batch);
    if (batch.length === 0 || batch.length < largestPage) {
      return rows;
    }
    largestPage = batch.length;
  }

  // Fail closed rather than decide the hold from a partial list.
  throw new Error("Too many progression events to verify earlier promotions.");
}
