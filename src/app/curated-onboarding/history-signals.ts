import type { CuratedHistorySignals } from "@/features/curated-onboarding/engine";

/**
 * Loads the recent-history signals the curated engine adapts to. Database access is injected so the rules
 * below are testable without Supabase.
 *
 * Safety rules (FF-ENGINE-001):
 * - Pain and form-breakdown feedback is NEVER limited by recency or by a 40-row window. Every such row for the
 *   member is read (paged), so an old pain flag keeps its exercise out of a new routine.
 * - "Too hard" / "bad day" feedback only adapts effort, so the most recent 40 rows are enough.
 * - A failed signal query throws. The caller turns that into the closed "unavailable" outcome; it never
 *   silently falls back to "no signals", which would be a fail-open generation.
 */

export const CURATED_RECENT_FEEDBACK_LIMIT = 40;
export const CURATED_PAIN_FEEDBACK_PAGE_SIZE = 500;
export const CURATED_PAIN_FEEDBACK_MAX_PAGES = 20;

const PAIN_OR_FORM_SIGNALS = ["form_breakdown", "pain_flag"] as const;
const EFFORT_SIGNALS = ["too_hard", "bad_day"] as const;

type FeedbackRow = {
  copilot_feedback_signal?: string | null;
  exercise?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null; count?: number | null };

// Structural subset of the Supabase client used here; the real client satisfies it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CuratedSignalsClient = { from: (table: string) => any };

export function toCatalogSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function feedbackBase(supabase: CuratedSignalsClient, userId: string) {
  return supabase
    .from("session_exercises")
    .select("copilot_feedback_signal, exercise:exercises(name)")
    .eq("user_id", userId);
}

async function loadRecentEffortFeedback(supabase: CuratedSignalsClient, userId: string): Promise<FeedbackRow[]> {
  const result = (await feedbackBase(supabase, userId)
    .in("copilot_feedback_signal", [...EFFORT_SIGNALS])
    .order("copilot_feedback_updated_at", { ascending: false })
    .limit(CURATED_RECENT_FEEDBACK_LIMIT)) as QueryResult<FeedbackRow[]>;
  if (result.error) throw new Error(`effort feedback query failed: ${result.error.message}`);
  return result.data ?? [];
}

async function loadAllPainOrFormFeedback(supabase: CuratedSignalsClient, userId: string): Promise<FeedbackRow[]> {
  const rows: FeedbackRow[] = [];
  for (let page = 0; page < CURATED_PAIN_FEEDBACK_MAX_PAGES; page += 1) {
    const from = page * CURATED_PAIN_FEEDBACK_PAGE_SIZE;
    const result = (await feedbackBase(supabase, userId)
      .in("copilot_feedback_signal", [...PAIN_OR_FORM_SIGNALS])
      .order("copilot_feedback_updated_at", { ascending: false })
      .range(from, from + CURATED_PAIN_FEEDBACK_PAGE_SIZE - 1)) as QueryResult<FeedbackRow[]>;
    if (result.error) throw new Error(`pain feedback query failed: ${result.error.message}`);
    const data = result.data ?? [];
    rows.push(...data);
    if (data.length < CURATED_PAIN_FEEDBACK_PAGE_SIZE) return rows;
  }
  // More pain rows than the page budget: refuse to generate on a partial safety history.
  throw new Error("pain feedback history exceeds the paging budget");
}

function exerciseSlug(row: FeedbackRow) {
  const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
  return exercise?.name ? toCatalogSlug(exercise.name) : "";
}

export async function loadCuratedHistorySignals(args: {
  userId: string;
  activeRoutineId?: string | null;
  supabase: CuratedSignalsClient;
}): Promise<CuratedHistorySignals> {
  const [effortRows, painRows] = await Promise.all([
    loadRecentEffortFeedback(args.supabase, args.userId),
    loadAllPainOrFormFeedback(args.supabase, args.userId),
  ]);
  const failedExerciseSlugs = new Set<string>();
  const fatiguedExerciseSlugs = new Set<string>();
  const painOrFormExerciseSlugs = new Set<string>();
  for (const row of effortRows) {
    const slug = exerciseSlug(row);
    if (!slug) continue;
    if (row.copilot_feedback_signal === "too_hard") failedExerciseSlugs.add(slug);
    fatiguedExerciseSlugs.add(slug);
  }
  // Pain and form breakdown are never kept in a routine; "too hard" may stay with a visible reason.
  for (const row of painRows) {
    const slug = exerciseSlug(row);
    if (slug) painOrFormExerciseSlugs.add(slug);
  }
  const base = {
    failedExerciseSlugs: [...failedExerciseSlugs].sort(),
    fatiguedExerciseSlugs: [...fatiguedExerciseSlugs].sort(),
    painOrFormExerciseSlugs: [...painOrFormExerciseSlugs].sort(),
  };

  if (!args.activeRoutineId) {
    return { completionRate: null, missedWorkoutCount: 0, ...base };
  }

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const [routineResult, trainingDaysResult, completedSessionsResult] = await Promise.all([
    args.supabase.from("routines").select("created_at").eq("id", args.activeRoutineId).eq("user_id", args.userId).maybeSingle(),
    args.supabase.from("routine_days").select("id", { count: "exact", head: true }).eq("routine_id", args.activeRoutineId).eq("user_id", args.userId).eq("is_rest", false),
    args.supabase.from("sessions").select("id", { count: "exact", head: true }).eq("routine_id", args.activeRoutineId).eq("user_id", args.userId).eq("status", "completed").gte("performed_at", since),
  ]) as [QueryResult<{ created_at?: string | null }>, QueryResult<unknown>, QueryResult<unknown>];
  const createdAtMs = routineResult.data?.created_at ? Date.parse(routineResult.data.created_at) : Number.NaN;
  const elapsedWeeks = Number.isFinite(createdAtMs)
    ? Math.min(4, Math.max(1, Math.ceil((Date.now() - createdAtMs) / (7 * 24 * 60 * 60 * 1000))))
    : 4;
  const expectedWorkouts = Math.max(0, trainingDaysResult.count ?? 0) * elapsedWeeks;
  const completedWorkouts = Math.max(0, completedSessionsResult.count ?? 0);

  return {
    completionRate: expectedWorkouts > 0 ? Math.min(1, completedWorkouts / expectedWorkouts) : null,
    missedWorkoutCount: Math.max(0, expectedWorkouts - completedWorkouts),
    ...base,
  };
}
