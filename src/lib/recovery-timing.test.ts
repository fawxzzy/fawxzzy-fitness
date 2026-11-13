import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryTimingInsight, buildSessionRecoverySummary, formatRecoveryClock } from "./recovery-timing.ts";

test("recovery timing uses median observed between-set intervals", () => {
  const insight = buildRecoveryTimingInsight([
    { logged_at: "2026-07-13T01:00:00Z" },
    { logged_at: "2026-07-13T01:01:30Z" },
    { logged_at: "2026-07-13T01:03:10Z" },
    { logged_at: "2026-07-13T01:08:10Z" },
  ]);
  assert.equal(insight?.observedIntervalSeconds, 100);
  assert.equal(insight?.sampleCount, 3);
  assert.equal(insight?.label, "Observed rest 1:40");
});

test("recovery timing hides low-data and implausible intervals", () => {
  assert.equal(buildRecoveryTimingInsight([{ logged_at: "2026-07-13T01:00:00Z" }, { logged_at: "2026-07-13T01:00:05Z" }]), null);
  assert.equal(buildRecoveryTimingInsight([{ logged_at: "2026-07-13T01:00:00Z" }, { logged_at: "2026-07-13T02:00:00Z" }]), null);
});

test("recovery timing marks its source so it can be told apart from exercise-timer data", () => {
  const insight = buildRecoveryTimingInsight([
    { logged_at: "2026-07-13T01:00:00Z" },
    { logged_at: "2026-07-13T01:01:00Z" },
    { logged_at: "2026-07-13T01:02:00Z" },
  ]);
  assert.equal(insight?.source, "between_set_intervals");
});

test("recovery timing ignores warm-ups, missing timestamps and unordered rows", () => {
  const insight = buildRecoveryTimingInsight([
    { logged_at: "2026-07-13T01:03:00Z" },
    { logged_at: "2026-07-13T01:00:00Z", is_warmup: true },
    { logged_at: null },
    { logged_at: "2026-07-13T01:01:00Z" },
    { logged_at: "2026-07-13T01:02:00Z" },
    { logged_at: "not a date" },
  ]);
  assert.equal(insight?.observedIntervalSeconds, 60);
  assert.equal(insight?.sampleCount, 2);
});

test("recovery timing is the same across local midnight and any UTC offset", () => {
  // The same three instants written in different offsets, straddling local midnight in every one of them.
  const utc = buildRecoveryTimingInsight([
    { logged_at: "2026-07-13T04:59:00Z" },
    { logged_at: "2026-07-13T05:00:30Z" },
    { logged_at: "2026-07-13T05:02:00Z" },
  ]);
  const shifted = buildRecoveryTimingInsight([
    { logged_at: "2026-07-12T23:59:00-05:00" },
    { logged_at: "2026-07-13T00:00:30-05:00" },
    { logged_at: "2026-07-13T07:02:00+02:00" },
  ]);
  assert.equal(utc?.observedIntervalSeconds, 90);
  assert.deepEqual(shifted, utc);
});

test("recovery timing does not read the exercise timer", () => {
  const withTimerFields = [
    { logged_at: "2026-07-13T01:00:00Z" },
    { logged_at: "2026-07-13T01:01:30Z" },
    { logged_at: "2026-07-13T01:03:00Z", exercise_timer_elapsed_seconds: 9999 },
    { logged_at: "2026-07-13T01:04:30Z", exercise_timer_elapsed_seconds: 1 },
  ];
  assert.equal(buildRecoveryTimingInsight(withTimerFields)?.observedIntervalSeconds, 90);
});

function exerciseSets(offsetsSeconds: number[]) {
  const base = Date.parse("2026-07-13T01:00:00Z");
  return offsetsSeconds.map((offset) => ({ logged_at: new Date(base + offset * 1000).toISOString() }));
}

test("session recovery summary is the median of per-exercise observed rest", () => {
  const summary = buildSessionRecoverySummary([
    exerciseSets([0, 60, 120]),
    exerciseSets([0, 90, 180, 270]),
    exerciseSets([0, 120, 240]),
  ]);
  assert.equal(summary?.observedIntervalSeconds, 90);
  assert.equal(summary?.exerciseCount, 3);
  assert.equal(summary?.sampleCount, 7);
  assert.equal(summary?.label, "1:30");
  assert.equal(summary?.detail, "Median of 3 exercises");
  assert.equal(summary?.source, "between_set_intervals");
});

test("session recovery summary fails quietly with low data instead of faking precision", () => {
  assert.equal(buildSessionRecoverySummary([]), null);
  assert.equal(buildSessionRecoverySummary([exerciseSets([0, 60, 120])]), null);
  assert.equal(buildSessionRecoverySummary([exerciseSets([0, 60, 120]), exerciseSets([0, 60])]), null);
  assert.equal(buildSessionRecoverySummary([exerciseSets([0, 5, 10]), exerciseSets([0, 7200, 14400])]), null);
});

test("recovery clock formats minutes and padded seconds", () => {
  assert.equal(formatRecoveryClock(100), "1:40");
  assert.equal(formatRecoveryClock(65), "1:05");
  assert.equal(formatRecoveryClock(-4), "0:00");
});

test("session recovery summary ignores warm-up rows: their gaps never count", () => {
  const base = Date.parse("2026-07-13T01:00:00Z");
  const at = (seconds: number, is_warmup = false) => ({ logged_at: new Date(base + seconds * 1000).toISOString(), is_warmup });
  // Working gaps are 60 s; the warm-up sits 10 min away from the first working set (a 600 s gap if it counted).
  const withWarmup = [at(-600, true), at(0), at(60), at(120)];
  const withoutWarmup = [at(0), at(60), at(120)];
  assert.deepEqual(buildRecoveryTimingInsight(withWarmup), buildRecoveryTimingInsight(withoutWarmup));
  assert.equal(buildRecoveryTimingInsight(withWarmup)?.observedIntervalSeconds, 60);

  const summary = buildSessionRecoverySummary([withWarmup, [at(-300, true), at(0), at(90), at(180)]]);
  assert.equal(summary?.observedIntervalSeconds, 75);
  assert.equal(summary?.sampleCount, 4);

  // A session whose only extra rows are warm-ups has no usable rest: nothing is shown.
  assert.equal(buildSessionRecoverySummary([[at(0, true), at(60, true), at(120, true)], withoutWarmup]), null);
});
