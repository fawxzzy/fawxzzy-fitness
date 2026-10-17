import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildFitnessSnapshotSourceStateFromApp } from "./fitness-integration-server.ts";
import type { FitnessSupabaseClient } from "@/lib/supabase/schema";
import { settleClaimedSessionFollowUpJobs } from "../session-follow-up-jobs.ts";

test("standalone follow-up snapshot uses its supplied client without request context", async () => {
  const tables: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      const query = new Proxy({}, {
        get(_target, property) {
          if (property === "then") {
            return (resolve: (value: unknown) => void) => resolve({ data: [], count: 0, error: null });
          }
          if (property === "maybeSingle") {
            return async () => ({ data: null, error: null });
          }
          return () => query;
        },
      });
      return query;
    },
  } as unknown as FitnessSupabaseClient;

  const state = await buildFitnessSnapshotSourceStateFromApp(
    "fixture-member",
    new Date("2026-10-17T03:09:55.111Z"),
    client,
  );

  assert.equal(state.memberId, "fixture-member");
  assert.ok(tables.includes("profiles"));
  assert.ok(tables.includes("sessions"));
});

test("standalone integration handler settles with its client and no Next request", async () => {
  const originalCwd = process.cwd();
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "fitness-followup-client-fixture-"));
  assert.equal(path.dirname(fixtureRoot), tmpdir());
  const tables: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      const query = new Proxy({}, {
        get(_target, property) {
          if (property === "then") {
            return (resolve: (value: unknown) => void) => resolve({ data: [], count: 0, error: null });
          }
          if (property === "maybeSingle") {
            return async () => ({ data: table === "session_follow_up_jobs" ? { id: "fixture-job" } : null, error: null });
          }
          return () => query;
        },
      });
      return query;
    },
  } as unknown as FitnessSupabaseClient;

  try {
    process.chdir(fixtureRoot);
    const result = await settleClaimedSessionFollowUpJobs({
      client,
      claimedJobs: [{ id: "fixture-job", job_kind: "fitness_integrations", status: "processing", attempt_count: 1 }],
      sessionId: "fixture-session",
      userId: "fixture-member",
      durationSeconds: 60,
      affectedExerciseIds: [],
      now: new Date("2026-10-17T03:09:55.111Z"),
    });
    assert.equal(result.hadFailures, false, JSON.stringify(result.results));
    assert.ok(tables.includes("profiles"));
    assert.ok(tables.includes("session_follow_up_jobs"));
  } finally {
    process.chdir(originalCwd);
    await rm(fixtureRoot, { recursive: true, force: false });
  }
});
