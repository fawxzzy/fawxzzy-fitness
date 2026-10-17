import test from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_FOLLOW_UP_MAX_ATTEMPTS,
  buildSessionFollowUpExecutionPlan,
  buildSessionFollowUpJobSeeds,
  selectExactPendingSessionFollowUpGroup,
  processExactPendingSessionFollowUpGroup,
  settleClaimedSessionFollowUpJobs,
  selectProcessableSessionFollowUpGroups,
  settleSessionFollowUpHandlers,
} from "./session-follow-up-jobs.ts";

const exactRows = [
  { id: "stats", session_id: "session", user_id: "user", job_kind: "exercise_stats" as const, status: "pending" as const, attempt_count: 0 },
  { id: "integration", session_id: "session", user_id: "user", job_kind: "fitness_integrations" as const, status: "pending" as const, attempt_count: 0 },
];

test("exact incident selector accepts only two pending kinds for one session and user", () => {
  assert.equal(selectExactPendingSessionFollowUpGroup(exactRows).rows.length, 2);
  for (const rows of [
    exactRows.slice(0, 1),
    [...exactRows, { ...exactRows[1], id: "third" }],
    [exactRows[0], { ...exactRows[1], status: "processing" as const }],
    [exactRows[0], { ...exactRows[1], attempt_count: SESSION_FOLLOW_UP_MAX_ATTEMPTS }],
    [exactRows[0], { ...exactRows[1], session_id: "other" }],
    [exactRows[0], { ...exactRows[1], job_kind: "exercise_stats" as const }],
  ]) {
    assert.throws(() => selectExactPendingSessionFollowUpGroup(rows), /EXACT_FOLLOW_UP_GROUP_MISMATCH/);
  }
});

test("exact processor skips 114 older jobs and stops after a changed claim", async () => {
  const timestamp = "2026-10-17T03:09:55.111465Z";
  const allRows = [
    ...Array.from({ length: 114 }, (_, index) => ({
      ...exactRows[0], id: `older-${index}`, session_id: `older-session-${index}`,
      created_at: "2026-10-16T00:00:00.000000Z",
    })),
    ...exactRows.map((row) => ({ ...row, created_at: timestamp })),
  ];
  let claims = 0;
  const selectedTables: string[] = [];
  const client = {
    from(table: string) {
      selectedTables.push(table);
      const filters: Record<string, string> = {};
      const query = {
        select() { return this; },
        eq(key: string, value: string) { filters[key] = value; return this; },
        maybeSingle() { return Promise.resolve({ data: { status: "completed", duration_seconds: 60 }, error: null }); },
        then(resolve: (value: unknown) => void) {
          const data = table === "session_follow_up_jobs"
            ? allRows.filter((row) =>
                (!filters.created_at || row.created_at === filters.created_at) &&
                (!filters.session_id || row.session_id === filters.session_id))
            : table === "session_exercises" ? [{ exercise_id: "exercise" }] : null;
          resolve({ data, error: null });
        },
      };
      return query;
    },
    rpc() { claims += 1; return Promise.resolve({ data: [], error: null }); },
  };
  await assert.rejects(() => processExactPendingSessionFollowUpGroup({
    client: client as never,
    createdAt: timestamp,
    now: new Date("2026-10-17T05:00:00Z"),
  }), /EXACT_FOLLOW_UP_CLAIM_CHANGED/);
  assert.equal(claims, 1);
  assert.deepEqual(selectedTables, [
    "session_follow_up_jobs", "session_follow_up_jobs", "sessions", "session_exercises",
  ]);
});

test("settlement reports a zero-row status write as failure after a successful handler", async () => {
  let handlerCalls = 0;
  const client = {
    from() {
      return {
        update() { return this; },
        eq() { return this; },
        select() { return this; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
      };
    },
  };
  const result = await settleClaimedSessionFollowUpJobs({
    client: client as never,
    claimedJobs: [{ ...exactRows[0], status: "processing", attempt_count: 1 }],
    sessionId: "session",
    userId: "user",
    durationSeconds: 60,
    affectedExerciseIds: [],
    now: new Date("2026-10-17T05:00:00Z"),
    handlersByKind: { exercise_stats: async () => { handlerCalls += 1; } },
  });
  assert.equal(handlerCalls, 1);
  assert.equal(result.hadFailures, true);
  assert.equal(result.results.at(-1)?.error, "FOLLOW_UP_SETTLEMENT_FAILED");
});

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
