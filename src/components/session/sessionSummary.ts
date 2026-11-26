import { deriveSessionAnalytics } from "@/lib/session-analytics";
import { formatSetDisplay } from "@/lib/formatting";

/**
 * Post-workout summary (DESIGN #1, 2026-11-26). Built only from what the session screen already holds: the live set
 * snapshots `SessionExerciseFocus` keeps per exercise (logged + queued sets) and the exercise names. No PR line: a PR
 * needs the person's previous bests, which the session screen never loads (History computes PRs server-side).
 */
export type SessionSummarySet = {
  weight: number | null;
  reps: number | null;
  weightUnit: "lbs" | "kg" | null;
};

export type SessionSummaryExercise = {
  name: string;
  loggedSetCount: number;
  isSkipped: boolean;
  sets: SessionSummarySet[];
};

export type SessionSummaryRow = {
  name: string;
  /** "3 sets", "Skipped", "Skipped · 1 set logged". */
  detail: string;
  state: "done" | "skipped" | "partial";
};

export type SessionSummaryDetails = {
  /** "12,450 lbs lifted". Null when nothing weighted was logged or the weighted sets mix lbs and kg (a sum would lie). */
  volumeLabel: string | null;
  /** Heaviest set, same rule as History's "Top set" (`deriveSessionAnalytics.bestLift`). */
  topSet: { exerciseName: string; display: string } | null;
  /** One line per exercise that was worked or skipped; untouched, unskipped exercises are left out. */
  rows: SessionSummaryRow[];
};

/** Saved or queued set rows -> the fields the summary reads. */
export function toSessionSummarySets(
  sets: ReadonlyArray<{ weight: number | null; reps: number | null; weight_unit?: "lbs" | "kg" | null }> | null | undefined,
): SessionSummarySet[] {
  return (sets ?? []).map((set) => ({ weight: set.weight, reps: set.reps, weightUnit: set.weight_unit ?? null }));
}

function formatSetCount(count: number) {
  return `${count} ${count === 1 ? "set" : "sets"}`;
}

export function buildSessionSummaryRows(exercises: readonly SessionSummaryExercise[]): SessionSummaryRow[] {
  const rows: SessionSummaryRow[] = [];
  for (const exercise of exercises) {
    const count = Math.max(0, Math.floor(exercise.loggedSetCount));
    if (exercise.isSkipped) {
      rows.push(count > 0
        ? { name: exercise.name, detail: `Skipped · ${formatSetCount(count)} logged`, state: "partial" }
        : { name: exercise.name, detail: "Skipped", state: "skipped" });
      continue;
    }
    if (count > 0) {
      rows.push({ name: exercise.name, detail: formatSetCount(count), state: "done" });
    }
  }
  return rows;
}

export function buildSessionSummaryDetails(exercises: readonly SessionSummaryExercise[]): SessionSummaryDetails {
  // Skipped exercises still count their logged sets, like History (it sums every saved set of the session).
  const analytics = deriveSessionAnalytics(
    exercises.map((exercise, index) => ({
      exerciseId: String(index),
      sets: exercise.sets.map((set) => ({
        weight: Number.isFinite(set.weight ?? NaN) ? (set.weight as number) : 0,
        reps: Number.isFinite(set.reps ?? NaN) ? (set.reps as number) : 0,
        weightUnit: set.weightUnit,
      })),
    })),
  );

  const weightedUnits = new Set<string>();
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if ((set.weight ?? 0) > 0 && (set.reps ?? 0) > 0 && set.weightUnit) {
        weightedUnits.add(set.weightUnit);
      }
    }
  }
  const volume = Math.round(analytics.totalVolume);
  const volumeUnit = weightedUnits.size === 1 ? [...weightedUnits][0] : null;
  const volumeLabel = volume > 0 && weightedUnits.size <= 1
    ? `${volume.toLocaleString("en-US")}${volumeUnit ? ` ${volumeUnit}` : ""} lifted`
    : null;

  let topSet: SessionSummaryDetails["topSet"] = null;
  const best = analytics.bestLift;
  if (best) {
    const display = best.weight
      ? formatSetDisplay({ weight: best.weight, reps: best.reps, unit: best.unit })
      : formatSetDisplay({ reps: best.reps });
    const exercise = exercises[Number(best.exerciseId)];
    if (display && exercise) {
      topSet = { exerciseName: exercise.name, display };
    }
  }

  return { volumeLabel, topSet, rows: buildSessionSummaryRows(exercises) };
}
