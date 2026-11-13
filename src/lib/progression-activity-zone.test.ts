import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { mock } from "node:test";

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
  const utcDefault = buildExerciseProgressionLifelineSummary([buildEvent()], { timeZone: null });
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
  profileError?: { code?: string; message?: string } | null;
  routineError?: { code?: string; message?: string } | null;
  throwOn?: "profiles" | "routines";
};

function createFakeSupabase(tables: FakeTables) {
  const queried: string[] = [];
  const client = {
    from(table: string) {
      queried.push(table);
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (tables.throwOn === table) {
            throw new Error("network down");
          }
          return {
            data: table === "profiles" ? (tables.profile ?? null) : (tables.routine ?? null),
            error: table === "profiles" ? (tables.profileError ?? null) : (tables.routineError ?? null),
          };
        },
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

test("loadHistoryTimeZone logs a failed lookup (source and error code only) instead of silently falling back", async () => {
  const warn = mock.method(console, "warn", () => undefined);
  try {
    // The profile query errors: logged by code, never by message; the History default applies.
    const profileError = createFakeSupabase({ profile: null, profileError: { code: "42501", message: "permission denied for table profiles (secret detail)" } });
    assert.equal(await loadHistoryTimeZone({ supabase: profileError.client, userId: "user-1" }), "America/New_York");
    assert.equal(warn.mock.callCount(), 1);
    assert.deepEqual(warn.mock.calls[0]?.arguments, ["[history-time-zone] lookup failed, falling back", { source: "profiles", code: "42501" }]);

    // The routine query errors: logged, and the profile zone still applies.
    warn.mock.resetCalls();
    const routineError = createFakeSupabase({
      profile: { timezone: "Asia/Tokyo", active_routine_id: "routine-1" },
      routine: null,
      routineError: { code: "PGRST116", message: "details" },
    });
    assert.equal(await loadHistoryTimeZone({ supabase: routineError.client, userId: "user-1" }), "Asia/Tokyo");
    assert.deepEqual(warn.mock.calls[0]?.arguments, ["[history-time-zone] lookup failed, falling back", { source: "routines", code: "PGRST116" }]);

    // A thrown query never rejects the caller: logged by error name, default zone.
    warn.mock.resetCalls();
    const thrown = createFakeSupabase({ throwOn: "profiles" });
    assert.equal(await loadHistoryTimeZone({ supabase: thrown.client, userId: "user-1" }), "America/New_York");
    assert.deepEqual(warn.mock.calls[0]?.arguments, ["[history-time-zone] lookup failed, falling back", { source: "exception", code: "Error" }]);
    for (const call of warn.mock.calls) {
      assert.doesNotMatch(JSON.stringify(call.arguments), /secret detail|network down|user-1/);
    }

    // A healthy lookup logs nothing.
    warn.mock.resetCalls();
    const healthy = createFakeSupabase({ profile: { timezone: "UTC", active_routine_id: null } });
    await loadHistoryTimeZone({ supabase: healthy.client, userId: "user-1" });
    assert.equal(warn.mock.callCount(), 0);
  } finally {
    warn.mock.restore();
  }
});

test("the lifeline summary requires an explicit timeZone: omitting it does not compile", () => {
  // @ts-expect-error timeZone is a required option; this line must keep failing to type-check without it.
  const omitted = (): unknown => buildExerciseProgressionLifelineSummary([buildEvent()], {});
  void omitted;

  // The explicit UTC choice still compiles and behaves as the analytics default.
  assert.deepEqual(
    buildExerciseProgressionLifelineSummary([buildEvent()], { timeZone: null })?.activityDays?.map((day) => day.id),
    ["2026-11-13"],
  );
});

test("contract: every user-facing caller passes a zone, and the exercises page resolves the scope once", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const exerciseInfo = read("./exercise-info.ts");
  const browser = read("./exercises-browser.ts");
  const detailPage = read("../app/history/[sessionId]/page.tsx");

  assert.match(exerciseInfo, /buildExerciseProgressionLifelineSummary\(activeProgressionEvents, \{ timeZone: scopeContext\.historyTimeZone \}\)/);
  assert.match(browser, /\{ timeZone: historyTimeZone \}\),/);
  assert.match(detailPage, /timeZone: historyTimeZone,/);

  // The browser neither blocks on a sequential zone lookup nor repeats the scope lookup the page already runs.
  assert.doesNotMatch(browser, /await loadHistoryTimeZone\(/);
  assert.match(browser, /const historyTimeZone = await historyTimeZonePromise;/);
  assert.match(browser, /historyTimeZone: scopeContextPromise\.then\(\(resolved\) => resolved\.historyTimeZone\)/);
});
