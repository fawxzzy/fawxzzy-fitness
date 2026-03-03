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

export function evaluatePrSummaries(sets: PrEvaluationSet[]): {
  sessionCountsById: Map<string, PrCountByCategory>;
  exerciseSummaryById: Map<string, ExercisePrSummary>;
} {
  const sessionCountsById = new Map<string, PrCountByCategory>();
  const exerciseSummaryById = new Map<string, ExercisePrSummary>();
  const bestsByExerciseId = new Map<string, ExercisePrBests>();

  const orderedSets = [...sets].sort(compareChronological);

  for (const set of orderedSets) {
    const weight = normalizePositive(set.weight);
    const reps = normalizePositive(set.reps);

    const bests = bestsByExerciseId.get(set.exerciseId) ?? { bestWeight: 0, bestBodyweightReps: 0 };
    const exerciseSummary = exerciseSummaryById.get(set.exerciseId) ?? {
      counts: emptyPrCounts(),
      bestWeight: 0,
      bestBodyweightReps: 0,
    };

    const sessionCounts = sessionCountsById.get(set.sessionId) ?? emptyPrCounts();

    if (weight > 0 && weight > bests.bestWeight) {
      incrementPrCount(sessionCounts, "weight");
      incrementPrCount(exerciseSummary.counts, "weight");
      bests.bestWeight = weight;
    }

    if (weight === 0 && reps > bests.bestBodyweightReps) {
      incrementPrCount(sessionCounts, "reps");
      incrementPrCount(exerciseSummary.counts, "reps");
      bests.bestBodyweightReps = reps;
    }

    exerciseSummary.bestWeight = bests.bestWeight;
    exerciseSummary.bestBodyweightReps = bests.bestBodyweightReps;

    sessionCountsById.set(set.sessionId, sessionCounts);
    exerciseSummaryById.set(set.exerciseId, exerciseSummary);
    bestsByExerciseId.set(set.exerciseId, bests);
  }

  return { sessionCountsById, exerciseSummaryById };
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
