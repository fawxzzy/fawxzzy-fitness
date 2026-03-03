import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sessionActions = readFileSync(new URL("../src/app/session/[id]/actions.ts", import.meta.url), "utf8");
const historyActions = readFileSync(new URL("../src/app/actions/history.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/030_backfill_session_exercises_exercise_id.sql", import.meta.url), "utf8");

assert.match(sessionActions, /resolveCanonicalExercise|requireCanonicalExercise/);
assert.match(sessionActions, /exercise_id:\s*canonicalExerciseId/);
assert.match(sessionActions, /persisted row missing exercise_id/);

assert.match(historyActions, /resolveCanonicalExercise|requireCanonicalExercise/);
assert.match(historyActions, /exercise_id:\s*resolvedExercise\.id/);

assert.match(migration, /UPDATE public\.session_exercises/);
assert.match(migration, /SET exercise_id = rde\.exercise_id/);

console.log("verify-canonical-exercise-linking: ok");
