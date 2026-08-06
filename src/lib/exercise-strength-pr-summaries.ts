import { isInvalidWeight } from "@/lib/pr-evaluator";
import { positive } from "@/lib/exercise-stats-formatting";

// Kept free of @/lib/auth (or other Next.js request-scoped) imports, and of
// "server-only", so this module is directly unit-testable outside the Next.js
// runtime -- exercise-info.ts itself cannot be (it transitively imports
// next/cache via @/lib/exercise-stats).
//
// exercise-info.ts independently reimplements the same weighted-vs-bodyweight
// PR/best-set classification that src/lib/pr-evaluator.ts's
// evaluatePrSummaries already implements (and, as of this wave, correctly
// excludes invalid negative-weight sets from) -- but only for the primary
// "N Rep PRs - N Weight PRs" badge count. Three further, independent
// duplicate implementations of the same classification logic existed inline
// in exercise-info.ts for PR-row highlighting, the detailed PR review-item
// list, and the "best set" stat block, none of which got that fix. This
// module centralizes the shared, corrected classification rule (reusing
// pr-evaluator.ts's own isInvalidWeight guard, the actual authoritative
// definition of "this weight value is corrupted, not a real bodyweight
// zero") so all of exercise-info.ts's parallel PR/best-set computations stay
// consistent with the RPC-adjacent fix instead of drifting from it again.

export type StrengthPrSet = {
  sessionId: string;
  performedAt: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  weightUnit: "lbs" | "lb" | "kg" | null;
};

function compareChronological(a: StrengthPrSet, b: StrengthPrSet): number {
  if (a.performedAt !== b.performedAt) return a.performedAt.localeCompare(b.performedAt);
  if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId);
  return a.setIndex - b.setIndex;
}

// Replaces exercise-info.ts's local buildStrengthPrRowIds: which specific
// rows (by "sessionId-setIndex") should be highlighted as a PR in the UI.
// A row with an invalid (negative) weight is skipped entirely -- it can
// neither itself be flagged as a PR row, nor count toward the running best
// values that later rows are compared against.
export function selectStrengthPrRowIds(rows: StrengthPrSet[]): Set<string> {
  const ids = new Set<string>();
  let bestWeight = 0;
  let bestBodyweightReps = 0;

  const ordered = [...rows].sort(compareChronological);

  for (const row of ordered) {
    if (isInvalidWeight(row.weight)) {
      continue;
    }

    const weight = positive(row.weight);
    const reps = positive(row.reps);
    const rowId = `${row.sessionId}-${row.setIndex}`;

    if (weight > 0 && weight > bestWeight) {
      bestWeight = weight;
      ids.add(rowId);
    }

    if (weight === 0 && reps > bestBodyweightReps) {
      bestBodyweightReps = reps;
      ids.add(rowId);
    }
  }

  return ids;
}

export type StrengthPrReviewEvent =
  | { kind: "weight"; weight: number; reps: number | null; weightUnit: "lbs" | "lb" | "kg" | null; performedAt: string }
  | { kind: "reps"; reps: number; performedAt: string };

// Replaces exercise-info.ts's local buildStrengthPrReviewItems's
// classification step. Returns events in the same most-recent-first order
// the original produced (chronological pass, then reversed); the caller
// still owns formatting each event into its final display string, since
// that requires exercise-info.ts's own formatWeightReps/formatWeight/
// formatDateShort helpers.
export function buildStrengthPrReviewEvents(rows: StrengthPrSet[]): StrengthPrReviewEvent[] {
  const orderedRows = [...rows].sort(compareChronological);
  const events: StrengthPrReviewEvent[] = [];
  let bestWeight = 0;
  let bestBodyweightReps = 0;

  for (const row of orderedRows) {
    if (isInvalidWeight(row.weight)) {
      continue;
    }

    const weight = positive(row.weight);
    const reps = positive(row.reps);

    if (weight > 0 && weight > bestWeight) {
      bestWeight = weight;
      events.push({ kind: "weight", weight, reps: row.reps, weightUnit: row.weightUnit, performedAt: row.performedAt });
    }

    if (weight === 0 && reps > bestBodyweightReps) {
      bestBodyweightReps = reps;
      events.push({ kind: "reps", reps, performedAt: row.performedAt });
    }
  }

  return events.reverse();
}

export type StrengthBestSetClassification = {
  totalReps: number;
  weightedRows: StrengthPrSet[];
  bodyweightRows: StrengthPrSet[];
  bestWeight: number;
  bestWeightedReps: number;
  bestRepsAtBestWeight: number;
  bestWeightedSet: StrengthPrSet | null;
  bestBodyweightReps: number;
  bestBodyweightSet: StrengthPrSet | null;
};

// Replaces exercise-info.ts's inline "best set" stat-block computation.
// Rows with an invalid (negative) weight are excluded up front, before any
// weighted/bodyweight split, best-value comparison, or "best set" selection.
export function classifyStrengthBestSets(rows: StrengthPrSet[]): StrengthBestSetClassification {
  const validRows = rows.filter((row) => !isInvalidWeight(row.weight));

  const totalReps = validRows.reduce((sum, row) => sum + positive(row.reps), 0);
  const weightedRows = validRows.filter((row) => positive(row.weight) > 0);
  const bodyweightRows = validRows.filter((row) => positive(row.weight) === 0 && positive(row.reps) > 0);
  const bestWeight = weightedRows.reduce((max, row) => Math.max(max, positive(row.weight)), 0);
  const bestWeightedReps = weightedRows.reduce((max, row) => Math.max(max, positive(row.reps)), 0);
  const bestRepsAtBestWeight = bestWeight > 0
    ? weightedRows.filter((row) => positive(row.weight) === bestWeight).reduce((max, row) => Math.max(max, positive(row.reps)), 0)
    : 0;
  const bestWeightedSet = bestWeight > 0
    ? weightedRows
        .filter((row) => positive(row.weight) === bestWeight)
        .sort((a, b) => positive(b.reps) - positive(a.reps))[0] ?? null
    : null;
  const bestBodyweightReps = bodyweightRows.reduce((max, row) => Math.max(max, positive(row.reps)), 0);
  const bestBodyweightSet = bestBodyweightReps > 0
    ? bodyweightRows
        .filter((row) => positive(row.reps) === bestBodyweightReps)
        .sort((a, b) => positive(b.reps) - positive(a.reps))[0] ?? null
    : null;

  return {
    totalReps,
    weightedRows,
    bodyweightRows,
    bestWeight,
    bestWeightedReps,
    bestRepsAtBestWeight,
    bestWeightedSet,
    bestBodyweightReps,
    bestBodyweightSet,
  };
}

export type SessionBestRowSelection = {
  bestRow: StrengthPrSet | null;
  bodyweightReps: number;
};

// Replaces exercise-info.ts's buildStrengthSessionPerformances's inline
// per-session bestRow/bodyweightReps computation. Invalid-weight rows are
// excluded before ranking, so a corrupted row can neither be selected as a
// session's "best" set nor contribute to its bodyweightReps value.
export function selectSessionBestRow(sessionRows: StrengthPrSet[]): SessionBestRowSelection {
  const validRows = sessionRows.filter((row) => !isInvalidWeight(row.weight));

  const rankedRows = [...validRows].sort((a, b) => {
    const aWeight = positive(a.weight);
    const bWeight = positive(b.weight);
    if (bWeight !== aWeight) return bWeight - aWeight;
    const aReps = positive(a.reps);
    const bReps = positive(b.reps);
    if (bReps !== aReps) return bReps - aReps;
    return b.setIndex - a.setIndex;
  });

  const bestRow = rankedRows.find((row) => positive(row.weight) > 0 || positive(row.reps) > 0) ?? null;
  const bodyweightReps = rankedRows.reduce(
    (max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0),
    0,
  );

  return { bestRow, bodyweightReps };
}
