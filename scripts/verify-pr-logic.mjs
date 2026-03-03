import assert from "node:assert/strict";

function emptyPrCounts() {
  return { reps: 0, weight: 0, total: 0 };
}

function incrementPrCount(counts, category) {
  counts[category] += 1;
  counts.total += 1;
}

function formatPrBreakdown(counts) {
  if (counts.total <= 0) return "";
  const parts = [];
  if (counts.reps > 0) parts.push(`${counts.reps} Rep PR${counts.reps === 1 ? "" : "s"}`);
  if (counts.weight > 0) parts.push(`${counts.weight} Weight PR${counts.weight === 1 ? "" : "s"}`);
  return parts.join(" • ");
}

function evaluate(sets) {
  const ordered = [...sets].sort((a, b) => a.performedAt.localeCompare(b.performedAt) || a.sessionId.localeCompare(b.sessionId) || a.setIndex - b.setIndex);
  const bests = new Map();
  const sessionCounts = new Map();

  for (const set of ordered) {
    const weight = Number.isFinite(set.weight) && set.weight > 0 ? set.weight : 0;
    const reps = Number.isFinite(set.reps) && set.reps > 0 ? set.reps : 0;
    const best = bests.get(set.exerciseId) ?? { bestWeight: 0, bestBodyweightReps: 0 };
    const counts = sessionCounts.get(set.sessionId) ?? emptyPrCounts();

    if (weight > 0 && weight > best.bestWeight) {
      incrementPrCount(counts, "weight");
      best.bestWeight = weight;
    }

    if (weight === 0 && reps > best.bestBodyweightReps) {
      incrementPrCount(counts, "reps");
      best.bestBodyweightReps = reps;
    }

    bests.set(set.exerciseId, best);
    sessionCounts.set(set.sessionId, counts);
  }

  return { sessionCounts, bests };
}

{
  const sets = [
    { exerciseId: "pullups", sessionId: "s1", performedAt: "2026-03-01T10:00:00Z", setIndex: 0, weight: 0, reps: 6 },
    { exerciseId: "pullups", sessionId: "s2", performedAt: "2026-03-02T10:00:00Z", setIndex: 0, weight: 0, reps: 8 },
  ];
  const result = evaluate(sets);
  assert.equal(result.sessionCounts.get("s2")?.reps, 1);
}

{
  const sets = [
    { exerciseId: "bench", sessionId: "s1", performedAt: "2026-03-01T10:00:00Z", setIndex: 0, weight: 100, reps: 5 },
    { exerciseId: "bench", sessionId: "s2", performedAt: "2026-03-02T10:00:00Z", setIndex: 0, weight: 110, reps: 4 },
  ];
  const result = evaluate(sets);
  assert.equal(result.sessionCounts.get("s2")?.weight, 1);
}

{
  assert.equal(formatPrBreakdown({ reps: 2, weight: 1, total: 3 }), "2 Rep PRs • 1 Weight PR");
  assert.equal(formatPrBreakdown({ reps: 1, weight: 0, total: 1 }), "1 Rep PR");
  assert.equal(formatPrBreakdown({ reps: 0, weight: 0, total: 0 }), "");
}

{
  const sets = [
    { exerciseId: "pullups", sessionId: "s1", performedAt: "2026-03-01T10:00:00Z", setIndex: 0, weight: 0, reps: 6 },
    { exerciseId: "pullups", sessionId: "s1", performedAt: "2026-03-01T10:00:00Z", setIndex: 1, weight: 0, reps: 8 },
  ];
  const result = evaluate(sets);
  assert.equal(result.sessionCounts.get("s1")?.reps, 2);
}

console.log("verify-pr-logic: ok");
