import { formatDurationClock } from "@/lib/duration";
import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatWeight } from "@/lib/formatting";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

/** One "before -> after" line of the Promote box (`PromoteCelebration`); values are display strings. */
export type PromoteStatRowValue = { label: string; from: string; to: string };

const EMPTY = "–";

function positive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** `3`, `8–10`, or null. A min/max pair that is equal (or has one side) prints as one value. */
function formatRange(min: number | null | undefined, max: number | null | undefined, format: (value: number) => string | null = (value) => String(value)): string | null {
  const low = positive(min);
  const high = positive(max);
  if (low !== null && high !== null && low !== high) {
    const a = format(Math.min(low, high));
    const b = format(Math.max(low, high));
    return a && b ? `${a}–${b}` : a ?? b;
  }
  const single = low ?? high;
  return single === null ? null : format(single);
}

function formatReps(plan: ProgressionTargetPlan): string | null {
  return positive(plan.repsTarget) !== null ? String(plan.repsTarget) : formatRange(plan.repsMin, plan.repsMax);
}

function formatWeightRange(plan: ProgressionTargetPlan): string | null {
  const low = positive(plan.weightMin);
  const high = positive(plan.weightMax);
  if (low !== null && high !== null && low !== high) {
    const a = formatWeight(Math.min(low, high), null);
    const b = formatWeight(Math.max(low, high), plan.weightUnit ?? null);
    return a && b ? `${a}–${b}` : b;
  }
  return formatWeight(low ?? high, plan.weightUnit ?? null);
}

const STATS: Array<{ label: string; read: (plan: ProgressionTargetPlan) => string | null }> = [
  { label: "Sets", read: (plan) => formatRange(plan.setsMin, plan.setsMax) },
  { label: "Reps", read: formatReps },
  { label: "Weight", read: formatWeightRange },
  { label: "Time", read: (plan) => (positive(plan.durationSeconds) !== null ? formatDurationClock(plan.durationSeconds as number) : null) },
  { label: "Distance", read: (plan) => formatDistance(plan.distance ?? null, plan.distanceUnit ?? null) },
  { label: "Calories", read: (plan) => formatCalories(plan.calories ?? null) },
];

/**
 * Rows for the Promote box from the goal before and after a promote: Sets, Reps, Weight, Time, Distance, Calories, in
 * that order, each only when either side has a value (a side without one shows an en dash). Pure; no "Target" wording.
 */
export function buildPromoteStatRows(from: ProgressionTargetPlan | null, to: ProgressionTargetPlan | null): PromoteStatRowValue[] {
  const rows: PromoteStatRowValue[] = [];
  for (const stat of STATS) {
    const before = from ? stat.read(from) : null;
    const after = to ? stat.read(to) : null;
    if (before === null && after === null) {
      continue;
    }
    rows.push({ label: stat.label, from: before ?? EMPTY, to: after ?? EMPTY });
  }
  return rows;
}
