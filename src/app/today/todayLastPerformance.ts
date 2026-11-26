import type { FitnessSupabaseClient } from "@/lib/supabase/schema";

/**
 * "Last: 5 × 225 lb" on Today's compact exercise list (wave 2 L-C "Start fast"): what the person did last time, so
 * the day reads as name, goal, last result. Source is `exercise_stats` (one row per member and exercise, kept by
 * the finish-workout path), read only. The formatter is pure and unit tested.
 */
export type TodayLastPerformanceInput = {
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
};

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function formatWeightUnit(unit: string | null) {
  const normalized = unit?.trim().toLowerCase();
  if (normalized === "kg") return "kg";
  if (normalized === "lb" || normalized === "lbs") return "lb";
  return null;
}

/** "Last: 5 × 225 lb", "Last: 8 reps", or null when there is nothing worth showing. */
export function formatTodayLastPerformance(stats: TodayLastPerformanceInput | null | undefined): string | null {
  if (!stats) return null;
  const reps = typeof stats.last_reps === "number" && stats.last_reps > 0 ? Math.round(stats.last_reps) : null;
  const weight = typeof stats.last_weight === "number" && stats.last_weight > 0 ? stats.last_weight : null;
  const unit = formatWeightUnit(stats.last_unit);
  if (reps !== null && weight !== null && unit) {
    return `Last: ${reps} × ${formatWeight(weight)} ${unit}`;
  }
  if (reps !== null) {
    return `Last: ${reps} ${reps === 1 ? "rep" : "reps"}`;
  }
  return null;
}

/**
 * Last-performance lines keyed by catalog exercise id. Never throws: Today must render without this line, so a
 * failed read returns an empty map.
 */
export async function loadTodayLastPerformanceLines({
  supabase,
  userId,
  exerciseIds,
}: {
  supabase: FitnessSupabaseClient;
  userId: string;
  exerciseIds: string[];
}): Promise<Map<string, string>> {
  const ids = Array.from(new Set(exerciseIds.filter(Boolean)));
  if (ids.length === 0) return new Map();
  try {
    const { data, error } = await supabase
      .from("exercise_stats")
      .select("exercise_id, last_weight, last_reps, last_unit")
      .eq("user_id", userId)
      .in("exercise_id", ids);
    if (error || !data) return new Map();
    const lines = new Map<string, string>();
    for (const row of data as Array<TodayLastPerformanceInput & { exercise_id: string }>) {
      const line = formatTodayLastPerformance(row);
      if (line) lines.set(row.exercise_id, line);
    }
    return lines;
  } catch {
    return new Map();
  }
}
