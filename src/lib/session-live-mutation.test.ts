import test from "node:test";
import assert from "node:assert/strict";

import { guardLiveSessionMutation, type LiveSessionMutationRepository } from "./session-live-mutation.ts";

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
