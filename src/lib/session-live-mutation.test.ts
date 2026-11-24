import test from "node:test";
import assert from "node:assert/strict";

import {
  decideSessionExerciseRemoval,
  guardLiveSessionMutation,
  parseLiveSessionStatus,
  REMOVE_EXERCISE_CHECK_ERROR,
  REMOVE_EXERCISE_HAS_SETS_ERROR,
  type LiveSessionMutationRepository,
} from "./session-live-mutation.ts";

function createRepository(args?: {
  session?: { id: string; userId: string; status: "in_progress" | "completed" } | null;
  sessionExercise?: { id: string; sessionId: string; userId: string } | null;
}): LiveSessionMutationRepository {
  return {
    async readSession() {
      return args?.session ?? null;
    },
    async readSessionExercise() {
      return args?.sessionExercise ?? null;
    },
  };
}

test("decideSessionExerciseRemoval refuses when any set is logged or the count is unknown", () => {
  assert.deepEqual(decideSessionExerciseRemoval(0), { ok: true });
  assert.deepEqual(decideSessionExerciseRemoval(1), { ok: false, error: REMOVE_EXERCISE_HAS_SETS_ERROR });
  assert.deepEqual(decideSessionExerciseRemoval(7), { ok: false, error: REMOVE_EXERCISE_HAS_SETS_ERROR });
  assert.deepEqual(decideSessionExerciseRemoval(null), { ok: false, error: REMOVE_EXERCISE_CHECK_ERROR });
  assert.deepEqual(decideSessionExerciseRemoval(Number.NaN), { ok: false, error: REMOVE_EXERCISE_CHECK_ERROR });
});

test("removeExerciseAction counts the row's sets and refuses before deleting", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../app/session/[id]/actions-log.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function removeExerciseAction");
  const body = source.slice(start, source.indexOf("\nexport async function", start + 10));
  const countAt = body.indexOf('.from("sets")');
  const decideAt = body.indexOf("decideSessionExerciseRemoval(setCountError ? null : (loggedSetCount ?? 0))");
  const deleteAt = body.indexOf('.from("session_exercises")');
  assert.ok(start >= 0 && countAt > 0 && decideAt > countAt && deleteAt > decideAt, "count, decide, then delete");
  assert.match(body, /if \(!removal\.ok\) \{\s*return removal;/);
});

test("parseLiveSessionStatus accepts only runtime-supported statuses", () => {
  assert.equal(parseLiveSessionStatus("in_progress"), "in_progress");
  assert.equal(parseLiveSessionStatus("completed"), "completed");
  assert.equal(parseLiveSessionStatus("paused"), null);
  assert.equal(parseLiveSessionStatus(null), null);
});

test("guardLiveSessionMutation rejects wrong-user writes", async () => {
  const result = await guardLiveSessionMutation(
    createRepository({
      session: { id: "session-1", userId: "user-a", status: "in_progress" },
    }),
    { userId: "user-b", sessionId: "session-1" },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "Can only edit the current active session.");
});

test("guardLiveSessionMutation rejects completed sessions", async () => {
  const result = await guardLiveSessionMutation(
    createRepository({
      session: { id: "session-1", userId: "user-a", status: "completed" },
    }),
    { userId: "user-a", sessionId: "session-1" },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "Can only edit the current active session.");
});

test("guardLiveSessionMutation rejects mismatched sessionExerciseId", async () => {
  const result = await guardLiveSessionMutation(
    createRepository({
      session: { id: "session-1", userId: "user-a", status: "in_progress" },
      sessionExercise: { id: "exercise-1", sessionId: "session-2", userId: "user-a" },
    }),
    { userId: "user-a", sessionId: "session-1", sessionExerciseId: "exercise-1" },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "Exercise does not belong to the current active session.");
});

test("guardLiveSessionMutation accepts the active session and its exercise", async () => {
  const result = await guardLiveSessionMutation(
    createRepository({
      session: { id: "session-1", userId: "user-a", status: "in_progress" },
      sessionExercise: { id: "exercise-1", sessionId: "session-1", userId: "user-a" },
    }),
    { userId: "user-a", sessionId: "session-1", sessionExerciseId: "exercise-1" },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.session.id, "session-1");
  assert.equal(result.data?.sessionExercise?.id, "exercise-1");
});
