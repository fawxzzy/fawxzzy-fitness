export type PrCategory = "reps" | "weight";

export type PrCountByCategory = {
  reps: number;
  weight: number;
  total: number;
};

export type PrEvaluationSet = {
  exerciseId: string;
  sessionId: string;
  performedAt: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
};

type ExercisePrBests = {
  bestWeight: number;
  bestBodyweightReps: number;
};

export type ExercisePrSummary = {
  counts: PrCountByCategory;
  bestWeight: number;
  bestBodyweightReps: number;
};

const EMPTY_COUNTS: PrCountByCategory = Object.freeze({ reps: 0, weight: 0, total: 0 });

export function emptyPrCounts(): PrCountByCategory {
  return { reps: 0, weight: 0, total: 0 };
}

export function incrementPrCount(counts: PrCountByCategory, category: PrCategory) {
  counts[category] += 1;
  counts.total += 1;
}

function compareChronological(a: PrEvaluationSet, b: PrEvaluationSet) {
  if (a.performedAt !== b.performedAt) return a.performedAt.localeCompare(b.performedAt);
  if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId);
  return a.setIndex - b.setIndex;
}

function normalizePositive(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

// A negative weight is never a legitimate logged value -- the live set-logging
// action (src/app/session/[id]/actions.ts) explicitly rejects `weight < 0` at
// the point of entry. The only way a negative value reaches here is corrupted
// or malformed data from the legacy-import bridge
// (src/lib/migration/fitness-legacy-bridge.ts), which has no sign validation.
// Treating it the same as a genuine bodyweight set (weight null/0) would let
// corrupted data manufacture a real, user-visible "Rep PR" badge from a set
// that may actually have been a weighted set with a garbled weight field --
// exclude it from PR evaluation entirely instead of silently recategorizing
// it. Non-finite values (NaN/Infinity) are left bucketed with null/0/bodyweight,
// since every current caller already normalizes non-finite input to null
// before it reaches this module, and unlike a negative sign, a non-finite
// value carries no signal that a real (if corrupted) weight was ever recorded.
function isInvalidWeight(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value < 0;
}

export function evaluatePrSummaries(sets: PrEvaluationSet[]): {
  sessionCountsById: Map<string, PrCountByCategory>;
  exerciseSummaryById: Map<string, ExercisePrSummary>;
  sessionPrExerciseIdsById: Map<string, Set<string>>;
} {
  const sessionCountsById = new Map<string, PrCountByCategory>();
  const exerciseSummaryById = new Map<string, ExercisePrSummary>();
  const sessionPrExerciseIdsById = new Map<string, Set<string>>();
  const bestsByExerciseId = new Map<string, ExercisePrBests>();

  const orderedSets = [...sets].sort(compareChronological);

  for (const set of orderedSets) {
    if (isInvalidWeight(set.weight)) {
      continue;
    }

    const weight = normalizePositive(set.weight);
    const reps = normalizePositive(set.reps);

    const bests = bestsByExerciseId.get(set.exerciseId) ?? { bestWeight: 0, bestBodyweightReps: 0 };
    const exerciseSummary = exerciseSummaryById.get(set.exerciseId) ?? {
      counts: emptyPrCounts(),
      bestWeight: 0,
      bestBodyweightReps: 0,
    };

    const sessionCounts = sessionCountsById.get(set.sessionId) ?? emptyPrCounts();
    const sessionPrExerciseIds = sessionPrExerciseIdsById.get(set.sessionId) ?? new Set<string>();

    if (weight > 0 && weight > bests.bestWeight) {
      incrementPrCount(sessionCounts, "weight");
      incrementPrCount(exerciseSummary.counts, "weight");
      bests.bestWeight = weight;
      sessionPrExerciseIds.add(set.exerciseId);
    }

    if (weight === 0 && reps > bests.bestBodyweightReps) {
      incrementPrCount(sessionCounts, "reps");
      incrementPrCount(exerciseSummary.counts, "reps");
      bests.bestBodyweightReps = reps;
      sessionPrExerciseIds.add(set.exerciseId);
    }

    exerciseSummary.bestWeight = bests.bestWeight;
    exerciseSummary.bestBodyweightReps = bests.bestBodyweightReps;

    sessionCountsById.set(set.sessionId, sessionCounts);
    sessionPrExerciseIdsById.set(set.sessionId, sessionPrExerciseIds);
    exerciseSummaryById.set(set.exerciseId, exerciseSummary);
    bestsByExerciseId.set(set.exerciseId, bests);
  }

  return { sessionCountsById, exerciseSummaryById, sessionPrExerciseIdsById };
}

function formatPrCategory(count: number, label: "Rep PR" | "Weight PR") {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function formatPrBreakdown(counts: PrCountByCategory): string {
  if (counts.total <= 0) return "";

  const parts: string[] = [];
  if (counts.reps > 0) parts.push(formatPrCategory(counts.reps, "Rep PR"));
  if (counts.weight > 0) parts.push(formatPrCategory(counts.weight, "Weight PR"));

  return parts.join(" • ");
}

export const EMPTY_PR_COUNTS = EMPTY_COUNTS;
