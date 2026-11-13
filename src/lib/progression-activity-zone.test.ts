import assert from "node:assert/strict";
import test from "node:test";

import { buildHistoryScopeSummary } from "./history-scope-summary.ts";
import { loadHistoryTimeZone } from "./history-time-zone.ts";
import { buildWeeklyProgressSummary } from "./history-weekly-progress.ts";
import { buildExerciseProgressionLifelineSummary } from "./progression-lifeline-summary.ts";
import type { FitnessSupabaseClient } from "./supabase/schema.ts";
import type { ProgressionEventRow } from "../types/db.ts";

const EASTERN = "America/New_York";

function buildEvent(overrides: Partial<ProgressionEventRow> = {}): ProgressionEventRow {
  return {
    id: "event-1",
    user_id: "user-1",
    routine_id: "routine-1",
    routine_day_exercise_id: "rde-1",
    exercise_id: "exercise-1",
    event_type: "promotion_applied",
    from_target: {},
    to_target: {},
    method: "double_progression",
    vector: "reps",
    step: null,
    reason: "",
    source_session_id: null,
    // Thu Nov 12 23:30 EST (UTC-5): the next day in UTC.
    created_at: "2026-11-13T04:30:00.000Z",
    ...overrides,
  } as ProgressionEventRow;
}

test("exercise progression lifeline buckets an evening Eastern event on its local day when given the History zone", () => {
  const eastern = buildExerciseProgressionLifelineSummary([buildEvent()], { timeZone: EASTERN });
  assert.deepEqual(eastern?.activityDays?.map((day) => [day.id, day.label]), [["2026-11-12", "Nov 12"]]);
  const easternActivity = eastern?.chartSections?.find((section) => section.id === "progression-activity");
  assert.deepEqual(easternActivity?.bars.map((bar) => bar.id), ["2026-11-12"]);

  // Without a zone the analytics default (UTC) applies, so the zone is what moves the bucket.
  const utcDefault = buildExerciseProgressionLifelineSummary([buildEvent()]);
  assert.deepEqual(utcDefault?.activityDays?.map((day) => day.id), ["2026-11-13"]);
  assert.deepEqual(
    utcDefault?.chartSections?.find((section) => section.id === "progression-activity")?.bars.map((bar) => bar.id),
    ["2026-11-13"],
  );
});

test("weekly progress summary passes its zone to the progression activity buckets and chart", () => {
  const baseArgs = {
    sessions: [],
    progressionEvents: [buildEvent()],
    sessionExercisesBySessionId: new Map(),
    setsBySessionExerciseId: new Map(),
    exerciseMetaById: new Map(),
    now: "2026-11-13T15:00:00.000Z",
  };

  const eastern = buildWeeklyProgressSummary({ ...baseArgs, timezone: EASTERN });
  assert.deepEqual(eastern.progressionSummary.activityBuckets.map((bucket) => bucket.id), ["2026-11-12"]);
  assert.deepEqual(
    eastern.progressionSummary.chartSections.find((section) => section.id === "progression-activity")?.bars.map((bar) => bar.id),
    ["2026-11-12"],
  );

  const utc = buildWeeklyProgressSummary({ ...baseArgs, timezone: "UTC" });
  assert.deepEqual(utc.progressionSummary.activityBuckets.map((bucket) => bucket.id), ["2026-11-13"]);
});

test("history scope summary passes its zone to the weekly progression activity buckets", () => {
  // Sun Nov 15 22:00 EST is Mon Nov 16 03:00Z: a different ISO week in UTC than in Eastern.
  const baseArgs = {
    sessions: [],
    progressionEvents: [buildEvent({ created_at: "2026-11-16T03:00:00.000Z" })],
    now: "2026-11-16T15:00:00.000Z",
  };

  const eastern = buildHistoryScopeSummary({ ...baseArgs, timezone: EASTERN });
  assert.deepEqual(eastern.progressionSummary.activityBuckets.map((bucket) => bucket.id), ["2026-11-09"]);

  const utc = buildHistoryScopeSummary({ ...baseArgs, timezone: "UTC" });
  assert.deepEqual(utc.progressionSummary.activityBuckets.map((bucket) => bucket.id), ["2026-11-16"]);
});

type FakeTables = {
  profile?: { timezone?: string | null; active_routine_id?: string | null } | null;
  routine?: { timezone?: string | null } | null;
};

function createFakeSupabase(tables: FakeTables) {
  const queried: string[] = [];
  const client = {
    from(table: string) {
      queried.push(table);
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: table === "profiles" ? (tables.profile ?? null) : (tables.routine ?? null) }),
      };
      return builder;
    },
  } as unknown as FitnessSupabaseClient;
  return { client, queried };
}

test("loadHistoryTimeZone follows History's rule: active routine zone, then profile zone, then the default", async () => {
  // A UTC profile (server-captured) with an Eastern active routine resolves to Eastern.
  const withRoutine = createFakeSupabase({ profile: { timezone: "UTC", active_routine_id: "routine-1" }, routine: { timezone: EASTERN } });
  assert.equal(await loadHistoryTimeZone({ supabase: withRoutine.client, userId: "user-1" }), EASTERN);
  assert.deepEqual(withRoutine.queried, ["profiles", "routines"]);

  // An already loaded profile skips the profile query.
  const preloaded = createFakeSupabase({ routine: { timezone: "America/Los_Angeles" } });
  assert.equal(
    await loadHistoryTimeZone({ supabase: preloaded.client, userId: "user-1", profile: { timezone: "UTC", active_routine_id: "routine-1" } }),
    "America/Los_Angeles",
  );
  assert.deepEqual(preloaded.queried, ["routines"]);

  // No active routine: the profile zone. An invalid routine zone also falls back to the profile zone.
  const noRoutine = createFakeSupabase({ profile: { timezone: "Asia/Tokyo", active_routine_id: null } });
  assert.equal(await loadHistoryTimeZone({ supabase: noRoutine.client, userId: "user-1" }), "Asia/Tokyo");
  assert.deepEqual(noRoutine.queried, ["profiles"]);
  const badRoutine = createFakeSupabase({ profile: { timezone: "Asia/Tokyo", active_routine_id: "routine-1" }, routine: { timezone: "Not/AZone" } });
  assert.equal(await loadHistoryTimeZone({ supabase: badRoutine.client, userId: "user-1" }), "Asia/Tokyo");

  // Nothing known: the History default.
  const nothing = createFakeSupabase({ profile: null });
  assert.equal(await loadHistoryTimeZone({ supabase: nothing.client, userId: "user-1" }), "America/New_York");
});
