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

function formatDurationShort(seconds) {
  const safe = positive(seconds);
  if (safe <= 0) return null;
  const minutes = Math.floor(safe / 60);
  const remainderSeconds = Math.floor(safe % 60);
  return `${minutes}:${String(remainderSeconds).padStart(2, "0")}`;
}

function summarizeCardioSession(rows) {
  const durationSeconds = rows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
  const distance = rows.reduce((sum, row) => sum + positive(row.distance), 0);
  const calories = rows.reduce((sum, row) => sum + positive(row.calories), 0);
  const p = pace(durationSeconds, distance);
  const parts = [formatDurationShort(durationSeconds), distance > 0 ? `${distance.toFixed(1)} mi` : null, p ? `${formatDurationShort(p)}/mi` : null, calories > 0 ? `${calories} cal` : null].filter(Boolean);
  return {
    durationSeconds,
    distance,
    calories,
    lastSummary: parts.join(" • "),
  };
}

{
  const inclineWalkRows = [
    { durationSeconds: 1200, distance: 1.0, calories: 130 },
    { durationSeconds: 0, distance: 0, calories: 0 },
    { durationSeconds: 0, distance: 0, calories: 0 },
  ];
  const stats = summarizeCardioSession(inclineWalkRows);
  assert.equal(stats.durationSeconds, 1200);
  assert.equal(stats.lastSummary.includes("20:00"), true);
  assert.notEqual(stats.lastSummary, "—");
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
