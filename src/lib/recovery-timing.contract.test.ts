import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const focusSource = read("../components/SessionExerciseFocus.tsx");
const historySource = read("../app/history/[sessionId]/LogAuditClient.tsx");
// Code only: the header comment is allowed to name the things the code must not do.
const timingSource = read("./recovery-timing.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("Current Session shows observed rest in the exercise card baseline, built from set timestamps", () => {
  assert.match(focusSource, /buildRecoveryTimingInsight\(currentExerciseSets\)/);
  assert.match(focusSource, /\{recoveryTimingInsight\.label\}/);
});

test("History shows observed rest per exercise and a session-level summary", () => {
  assert.match(historySource, /buildRecoveryTimingInsight\(setsForExercise\.map\(\(set\) => set\.source\)\)/);
  assert.match(historySource, /buildSessionRecoverySummary\(/);
  assert.match(historySource, /title: "Rest"/);
});

test("recovery timing stays separate from the exercise timer and never reads the wall clock", () => {
  assert.doesNotMatch(timingSource, /exercise-timer|exercise_timer|ExerciseTimer/);
  assert.doesNotMatch(timingSource, /Date\.now\(\)|new Date\(\)|getTimezoneOffset|toLocale/);
});

test("recovery copy describes what happened and never coaches", () => {
  assert.doesNotMatch(timingSource, /recommend|should rest|you should|coach|medical|\bAI\b/i);
});

test("the dormant RecoveryTimingPrompt aside is not wired in: owner review moved observed rest into the card baseline", () => {
  assert.doesNotMatch(focusSource, /RecoveryTimingPrompt/);
  assert.doesNotMatch(historySource, /RecoveryTimingPrompt/);
});
