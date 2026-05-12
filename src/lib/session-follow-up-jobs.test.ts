import test from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_FOLLOW_UP_MAX_ATTEMPTS,
  buildSessionFollowUpExecutionPlan,
  buildSessionFollowUpJobSeeds,
  selectProcessableSessionFollowUpGroups,
  settleSessionFollowUpHandlers,
} from "./session-follow-up-jobs.ts";

test("settleSessionFollowUpHandlers marks failures without throwing away successful work", async () => {
  const results = await settleSessionFollowUpHandlers({
    exercise_stats: async () => {
      // no-op
    },
    fitness_integrations: async () => {
      throw new Error("integration down");
    },
  });

  assert.equal(results.length, 2);
  assert.equal(results.find((result) => result.kind === "exercise_stats")?.ok, true);
  assert.equal(results.find((result) => result.kind === "fitness_integrations")?.ok, false);
  assert.equal(results.find((result) => result.kind === "fitness_integrations")?.error, "integration down");
});

test("settleSessionFollowUpHandlers only runs the claimed job kinds", async () => {
  const results = await settleSessionFollowUpHandlers({
    exercise_stats: async () => {
      // no-op
    },
  });

  assert.deepEqual(results, [
    {
      kind: "exercise_stats",
      ok: true,
      error: null,
    },
  ]);
});

test("buildSessionFollowUpExecutionPlan skips jobs past max attempts", () => {
  const plan = buildSessionFollowUpExecutionPlan([
    {
      id: "job-1",
      job_kind: "exercise_stats",
      status: "processing",
      attempt_count: SESSION_FOLLOW_UP_MAX_ATTEMPTS,
    },
    {
      id: "job-2",
      job_kind: "fitness_integrations",
      status: "processing",
      attempt_count: SESSION_FOLLOW_UP_MAX_ATTEMPTS + 1,
    },
  ]);

  assert.deepEqual(plan.runnable.map((job) => job.id), ["job-1"]);
  assert.deepEqual(plan.terminalResults, [
    {
      kind: "fitness_integrations",
      ok: false,
      error: `Max follow-up attempts exceeded (${SESSION_FOLLOW_UP_MAX_ATTEMPTS}).`,
    },
  ]);
});

test("buildSessionFollowUpJobSeeds enqueues independent consumers", () => {
  assert.deepEqual(buildSessionFollowUpJobSeeds({
    sessionId: "session-1",
    userId: "user-1",
  }), [
    {
      session_id: "session-1",
      user_id: "user-1",
      job_kind: "exercise_stats",
      status: "pending",
    },
    {
      session_id: "session-1",
      user_id: "user-1",
      job_kind: "fitness_integrations",
      status: "pending",
    },
  ]);
});

test("selectProcessableSessionFollowUpGroups claims pending failed and stale processing groups only", () => {
  const groups = selectProcessableSessionFollowUpGroups({
    staleBefore: new Date("2026-05-06T12:00:00.000Z"),
    limit: 10,
    rows: [
      {
        id: "job-completed",
        session_id: "session-completed",
        user_id: "user-1",
        job_kind: "exercise_stats",
        status: "completed",
        attempt_count: 1,
        updated_at: "2026-05-06T11:00:00.000Z",
      },
      {
        id: "job-processing-fresh",
        session_id: "session-fresh",
        user_id: "user-1",
        job_kind: "exercise_stats",
        status: "processing",
        attempt_count: 1,
        updated_at: "2026-05-06T12:01:00.000Z",
      },
      {
        id: "job-pending",
        session_id: "session-pending",
        user_id: "user-1",
        job_kind: "exercise_stats",
        status: "pending",
        attempt_count: 0,
        updated_at: "2026-05-06T11:55:00.000Z",
      },
      {
        id: "job-failed",
        session_id: "session-failed",
        user_id: "user-2",
        job_kind: "fitness_integrations",
        status: "failed",
        attempt_count: 2,
        updated_at: "2026-05-06T11:50:00.000Z",
      },
      {
        id: "job-processing-stale",
        session_id: "session-stale",
        user_id: "user-3",
        job_kind: "exercise_stats",
        status: "processing",
        attempt_count: 1,
        updated_at: "2026-05-06T11:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(groups, [
    { sessionId: "session-pending", userId: "user-1" },
    { sessionId: "session-failed", userId: "user-2" },
    { sessionId: "session-stale", userId: "user-3" },
  ]);
});
