import assert from "node:assert/strict";

function positive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function pace(durationSeconds, distance) {
  const d = positive(durationSeconds);
  const dist = positive(distance);
  if (d <= 0 || dist <= 0) return null;
  return d / dist;
}

function summarizeCardioRows(rows) {
  const totals = {
    sets: rows.length,
    durationSeconds: rows.reduce((sum, row) => sum + positive(row.durationSeconds), 0),
  };
  const bestDurationSeconds = rows.reduce((max, row) => Math.max(max, positive(row.durationSeconds)), 0);
  const bestPace = rows.map((row) => pace(row.durationSeconds, row.distance)).filter((value) => typeof value === "number").sort((a, b) => a - b)[0] ?? null;
  return { totals, bestDurationSeconds, bestPace };
}

{
  const inclineWalkRows = [
    { durationSeconds: 1200, distance: 1.0 },
    { durationSeconds: 0, distance: 0 },
    { durationSeconds: 0, distance: 0 },
  ];
  const stats = summarizeCardioRows(inclineWalkRows);
  assert.equal(stats.totals.sets, 3);
  assert.equal(stats.totals.durationSeconds, 1200);
  assert.equal(stats.bestDurationSeconds, 1200);
}

{
  const dipsRows = [
    { weight: 0, reps: 10 },
    { weight: 0, reps: 12 },
  ];
  const bestBodyweightReps = dipsRows.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0);
  assert.equal(bestBodyweightReps, 12);
}

console.log("verify-cardio-strength-summaries: ok");
