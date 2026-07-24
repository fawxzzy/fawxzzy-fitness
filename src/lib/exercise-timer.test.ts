import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyExerciseTimerCommand,
  formatExerciseTimerClock,
  finalizeRunningExerciseTimer,
  getExerciseTimerDisplaySeconds,
  getExerciseTimerElapsedSeconds,
  isExerciseTimerTargetComplete,
  parseExerciseTimerConfig,
  type ExerciseTimerSnapshot,
} from "./exercise-timer.ts";

const base: ExerciseTimerSnapshot = {
  enabled: true,
  mode: "countdown",
  targetSeconds: 90,
  elapsedSeconds: 15,
  status: "paused",
  startedAt: null,
  completedAt: null,
};

test("exercise timer derives running elapsed and countdown display deterministically", () => {
  const running = { ...base, status: "running" as const, startedAt: "2026-07-13T01:00:00.000Z" };
  const now = Date.parse("2026-07-13T01:00:20.000Z");
  assert.equal(getExerciseTimerElapsedSeconds(running, now), 35);
  assert.equal(getExerciseTimerDisplaySeconds(running, now), 55);
  assert.equal(isExerciseTimerTargetComplete(running, now), false);
});

test("exercise timer pause, reset, and completion preserve bounded truth", () => {
  const running = applyExerciseTimerCommand(base, "start", "2026-07-13T01:00:00.000Z");
  const paused = applyExerciseTimerCommand(running, "pause", "2026-07-13T01:00:12.000Z");
  assert.equal(paused.elapsedSeconds, 27);
  assert.equal(paused.status, "paused");
  const completed = applyExerciseTimerCommand(paused, "complete", "2026-07-13T01:01:00.000Z");
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, "2026-07-13T01:01:00.000Z");
  assert.equal(applyExerciseTimerCommand(completed, "reset", "2026-07-13T01:02:00.000Z").elapsedSeconds, 0);
});

test("exercise timer clock supports minute and hour durations", () => {
  assert.equal(formatExerciseTimerClock(65), "01:05");
  assert.equal(formatExerciseTimerClock(3661), "1:01:01");
});

test("exercise timer setup is off by default and validates countdown targets", () => {
  assert.deepEqual(parseExerciseTimerConfig({ enabled: false, mode: "", targetSeconds: "" }), { ok: true, config: null });
  assert.equal(parseExerciseTimerConfig({ enabled: true, mode: "countdown", targetSeconds: 0 }).ok, false);
  assert.deepEqual(parseExerciseTimerConfig({ enabled: true, mode: "countdown", targetSeconds: "90" }), {
    ok: true,
    config: { mode: "countdown", targetSeconds: 90 },
  });
});

test("session completion finalizes a running timer once with exact elapsed time", () => {
  const running = { ...base, status: "running" as const, startedAt: "2026-07-13T01:00:00.000Z" };
  const completed = finalizeRunningExerciseTimer(running, "2026-07-13T01:00:20.000Z");
  const replayed = finalizeRunningExerciseTimer(completed, "2026-07-13T01:01:00.000Z");

  assert.equal(completed.elapsedSeconds, 35);
  assert.equal(completed.status, "completed");
  assert.equal(completed.startedAt, null);
  assert.equal(completed.completedAt, "2026-07-13T01:00:20.000Z");
  assert.deepEqual(replayed, completed);
});

test("session save finalizes exercise timers before marking the session completed", () => {
  const source = readFileSync(new URL("../app/session/[id]/actions.ts", import.meta.url), "utf8");
  const saveAction = source.slice(source.indexOf("export async function saveSessionAction"));
  const finalizationIndex = saveAction.indexOf("finalizeRunningExerciseTimersForSession");
  const completionIndex = saveAction.indexOf('update({ duration_seconds: durationSeconds, status: "completed" })');

  assert.ok(finalizationIndex >= 0);
  assert.ok(completionIndex > finalizationIndex);
});
