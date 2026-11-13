import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { SessionSummary } from "../app/history/session-summary.ts";
import { buildCardioPrReviewItems } from "./cardio-pr-history.ts";
import {
  buildExerciseHistoryModel,
  buildProgressEntries,
  buildStrengthPrReviewItems,
} from "./exercise-info.ts";
import {
  formatExerciseInfoDayKeyLabel,
  formatExerciseInfoDayLabel,
  getExerciseInfoDayKey,
} from "./exercise-info-day-key.ts";
import { getWeeklyProgressDayKey } from "./history-weekly-progress.ts";
import { buildHistoryWorkoutStreak } from "./history-workout-streak.ts";
import { resolveHistoryTimeZone } from "./timezones.ts";

const EASTERN = "America/New_York";

/** The old behaviour, kept here so each test states what it used to answer. */
function legacyUtcSliceDayKey(value: string) {
  return value.length >= 10 ? value.slice(0, 10) : "";
}

test("a 23:30 Eastern session buckets to its local day, not the next UTC day", () => {
  // Nov 12 23:30 EST (UTC-5) is 2026-11-13T04:30:00Z.
  const instant = "2026-11-13T04:30:00.000Z";

  assert.equal(getExerciseInfoDayKey(instant, EASTERN), "2026-11-12");
  assert.equal(legacyUtcSliceDayKey(instant), "2026-11-13", "the old UTC slice put this session on the next day");

  // The sift case: a workout logged 19:10 EST is 00:10 UTC the next day.
  assert.equal(getExerciseInfoDayKey("2026-11-13T00:10:56.000Z", EASTERN), "2026-11-12");
  assert.equal(legacyUtcSliceDayKey("2026-11-13T00:10:56.000Z"), "2026-11-13");
});

test("the local-midnight edge follows the zone offset in force that day (EST)", () => {
  assert.equal(getExerciseInfoDayKey("2026-11-13T04:59:59.000Z", EASTERN), "2026-11-12");
  assert.equal(getExerciseInfoDayKey("2026-11-13T05:00:00.000Z", EASTERN), "2026-11-13");
});

test("DST end (2026-11-01, EDT to EST): both sides of the changeover and the repeated hour", () => {
  // Local midnight Nov 1 is still EDT (UTC-4): 04:00Z.
  assert.equal(getExerciseInfoDayKey("2026-11-01T03:59:59.000Z", EASTERN), "2026-10-31");
  assert.equal(getExerciseInfoDayKey("2026-11-01T04:00:00.000Z", EASTERN), "2026-11-01");
  // 01:30 happens twice (EDT then EST); both are Nov 1.
  assert.equal(getExerciseInfoDayKey("2026-11-01T05:30:00.000Z", EASTERN), "2026-11-01");
  assert.equal(getExerciseInfoDayKey("2026-11-01T06:30:00.000Z", EASTERN), "2026-11-01");
  // 23:30 EST on Nov 1 is 04:30Z on Nov 2.
  assert.equal(getExerciseInfoDayKey("2026-11-02T04:30:00.000Z", EASTERN), "2026-11-01");
  assert.equal(legacyUtcSliceDayKey("2026-11-02T04:30:00.000Z"), "2026-11-02");
});

test("DST start (2026-03-08, EST to EDT): the skipped hour does not move a session to another day", () => {
  assert.equal(getExerciseInfoDayKey("2026-03-08T04:59:59.000Z", EASTERN), "2026-03-07");
  assert.equal(getExerciseInfoDayKey("2026-03-08T05:00:00.000Z", EASTERN), "2026-03-08");
  // 03:30 EDT, the first valid time after the jump.
  assert.equal(getExerciseInfoDayKey("2026-03-08T07:30:00.000Z", EASTERN), "2026-03-08");
  // 23:30 EDT on Mar 8 is 03:30Z on Mar 9 (UTC-4).
  assert.equal(getExerciseInfoDayKey("2026-03-09T03:30:00.000Z", EASTERN), "2026-03-08");
  assert.equal(legacyUtcSliceDayKey("2026-03-09T03:30:00.000Z"), "2026-03-09");
});

test("other US zones and a zone ahead of UTC bucket on their own local day", () => {
  assert.equal(getExerciseInfoDayKey("2026-11-13T07:30:00.000Z", "America/Los_Angeles"), "2026-11-12");
  assert.equal(getExerciseInfoDayKey("2026-11-13T05:30:00.000Z", "America/Chicago"), "2026-11-12");
  assert.equal(getExerciseInfoDayKey("2026-11-13T06:30:00.000Z", "America/Phoenix"), "2026-11-12");
  assert.equal(getExerciseInfoDayKey("2026-11-13T09:30:00.000Z", "Pacific/Honolulu"), "2026-11-12");
  // Ahead of UTC the local day is the later one: 00:30 Nov 13 JST is 15:30Z on Nov 12.
  assert.equal(getExerciseInfoDayKey("2026-11-12T15:30:00.000Z", "Asia/Tokyo"), "2026-11-13");
  assert.equal(getExerciseInfoDayKey("2026-11-12T15:30:00.000Z", "UTC"), "2026-11-12");
});

test("value handling: day keys pass through, unusable values are empty, a bad zone falls back to the History default", () => {
  assert.equal(getExerciseInfoDayKey("2026-11-12", EASTERN), "2026-11-12");
  assert.equal(getExerciseInfoDayKey("", EASTERN), "");
  assert.equal(getExerciseInfoDayKey(null, EASTERN), "");
  assert.equal(getExerciseInfoDayKey(undefined, EASTERN), "");
  assert.equal(getExerciseInfoDayKey("not-a-date", EASTERN), "");
  assert.equal(getExerciseInfoDayKey("2026-11-13T04:30:00.000Z", "Not/AZone"), "2026-11-12");
  assert.equal(getExerciseInfoDayKey("2026-11-13T04:30:00.000Z", ""), "2026-11-12");
});

test("Exercise info agrees with History's own day rule for every hour across DST and year boundaries", () => {
  for (const timeZone of [EASTERN, "America/Los_Angeles", "Europe/London", "Asia/Tokyo", "UTC"]) {
    const start = Date.parse("2026-02-28T00:00:00.000Z");
    const end = Date.parse("2027-01-02T00:00:00.000Z");
    for (let time = start; time < end; time += 90 * 60 * 1000) {
      const instant = new Date(time).toISOString();
      assert.equal(
        getExerciseInfoDayKey(instant, timeZone),
        getWeeklyProgressDayKey(instant, timeZone),
        `${instant} in ${timeZone}`,
      );
    }
  }
});

test("a 23:30 Eastern session is the same day in History's streak and in Exercise info", () => {
  const session: SessionSummary = {
    id: "late",
    startedAt: "2026-11-13T04:30:00.000Z",
    routineTitle: "QA Routine",
    exerciseCount: 1,
    setCount: 2,
    repCount: 10,
    prCounts: { total: 0, weight: 0, reps: 0 },
    prLabel: "",
    totalVolume: 0,
    hasNote: false,
    hasSetData: true,
  };
  const historyTimeZone = resolveHistoryTimeZone({ activeRoutineTimeZone: EASTERN, profileTimeZone: "UTC" });
  const streak = buildHistoryWorkoutStreak({ sessions: [session], timezone: historyTimeZone });

  assert.equal(streak.lastCompletedDayKey, "2026-11-12");
  assert.equal(getExerciseInfoDayKey(session.startedAt, historyTimeZone), streak.lastCompletedDayKey);
});

test("day labels are formatted from the calendar day, independent of the runtime zone", () => {
  assert.equal(formatExerciseInfoDayKeyLabel("2026-11-12"), "Nov 12");
  assert.equal(formatExerciseInfoDayLabel("2026-11-13T04:30:00.000Z", EASTERN), "Nov 12");
  assert.equal(formatExerciseInfoDayLabel("2026-11-13T04:30:00.000Z", "UTC"), "Nov 13");
  assert.equal(formatExerciseInfoDayLabel(null, EASTERN), "Unknown");
  assert.equal(formatExerciseInfoDayLabel("garbage", EASTERN), "garbage");

  // A runtime far ahead of UTC (a phone in Kiritimati, UTC+14) must not move "Nov 12" to "Nov 13".
  const previousTimeZone = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Kiritimati";
    assert.equal(formatExerciseInfoDayKeyLabel("2026-11-12"), "Nov 12");
    assert.equal(formatExerciseInfoDayLabel("2026-11-13T04:30:00.000Z", EASTERN), "Nov 12");
  } finally {
    if (previousTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimeZone;
    }
  }
});

type HistoryRows = Parameters<typeof buildExerciseHistoryModel>[0]["rows"];

function strengthRow(overrides: Partial<HistoryRows[number]> & { sessionId: string; performedAt: string }): HistoryRows[number] {
  return {
    routineId: "routine-1",
    routineTitle: "QA Routine",
    setIndex: 0,
    weight: 135,
    reps: 5,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: "lbs",
    isSkipped: false,
    ...overrides,
  };
}

test("exercise history groups, chart points and PR history for a 23:30 Eastern session show the local day", () => {
  const rows: HistoryRows = [
    strengthRow({ sessionId: "s-early", performedAt: "2026-11-10T15:00:00.000Z", weight: 125 }),
    // Nov 12 23:30 EST: the sift defect showed this as Nov 13.
    strengthRow({ sessionId: "s-late", performedAt: "2026-11-13T04:30:00.000Z", weight: 145 }),
  ];

  const model = buildExerciseHistoryModel({
    rows,
    graphMetricKey: "weight",
    progressionEvents: [],
    timeZone: EASTERN,
  });

  const lateGroup = model.historyGroups.find((group) => group.rows.some((row) => row.sessionId === "s-late"));
  assert.equal(lateGroup?.dayKey, "2026-11-12");
  assert.equal(lateGroup?.label, "Nov 12");
  assert.equal(lateGroup?.rows[0]?.dayKey, "2026-11-12");
  assert.equal(lateGroup?.rows[0]?.dayLabel, "Nov 12");
  assert.deepEqual(model.historyGroups.map((group) => group.dayKey), ["2026-11-12", "2026-11-10"]);

  const latePoints = model.historyPoints.filter((point) => point.performedAt === "2026-11-13T04:30:00.000Z");
  assert.ok(latePoints.length >= 2, "a set point and a day point exist for the late session");
  for (const point of latePoints) {
    assert.equal(point.dayKey, "2026-11-12");
    assert.equal(point.label, "Nov 12");
  }

  // The same rows in UTC are the next day: the zone, not the data, decides.
  const utcModel = buildExerciseHistoryModel({ rows, graphMetricKey: "weight", progressionEvents: [], timeZone: "UTC" });
  assert.deepEqual(utcModel.historyGroups.map((group) => group.dayKey), ["2026-11-13", "2026-11-10"]);

  const prItems = buildStrengthPrReviewItems(rows, EASTERN);
  assert.ok(prItems.length > 0);
  assert.ok(prItems.some((item) => item.endsWith("| Nov 12")), `PR history shows the local day: ${prItems.join(" / ")}`);
  assert.ok(!prItems.some((item) => item.endsWith("| Nov 13")), "no PR is dated with the UTC day");

  const entries = buildProgressEntries(
    [{ sessionId: "s-late", performedAt: "2026-11-13T04:30:00.000Z", summary: "145 lbs x 5", setCount: 1, setSummaries: ["145 lbs x 5"] }],
    EASTERN,
  );
  assert.equal(entries[0]?.label, "Nov 12");
});

test("progression events and planned skipped days keep their own day when the zone is not UTC", () => {
  const model = buildExerciseHistoryModel({
    rows: [strengthRow({ sessionId: "s-1", performedAt: "2026-11-13T04:30:00.000Z" })],
    graphMetricKey: "weight",
    progressionEvents: [
      {
        id: "event-1",
        event_type: "promotion_applied",
        created_at: "2026-11-13T04:45:00.000Z",
        source_session_id: "s-1",
        routine_id: "routine-1",
      } as unknown as Parameters<typeof buildExerciseHistoryModel>[0]["progressionEvents"][number],
    ],
    // Planned days come from the routine calendar: their key is already a local day and must not be re-bucketed.
    plannedSkippedDays: [
      { dayKey: "2026-11-09", performedAt: "2026-11-09T12:00:00.000Z", routineId: "routine-1", routineTitle: "QA Routine" },
    ],
    timeZone: "Pacific/Auckland",
  });

  const skipped = model.historyGroups.find((group) => group.isSkipped === true && group.rows.length === 0);
  assert.equal(skipped?.dayKey, "2026-11-09");
  assert.equal(skipped?.label, "Nov 9");

  // 04:30Z is 17:30 Nov 13 in Auckland (NZDT, UTC+13): the session and its event share that local day.
  const sessionGroup = model.historyGroups.find((group) => group.rows.some((row) => row.sessionId === "s-1"));
  assert.equal(sessionGroup?.dayKey, "2026-11-13");
  assert.equal(sessionGroup?.label, "Nov 13");
});

test("cardio PR history dates follow the History zone too", () => {
  const sessionAggregates = [
    {
      performedAt: "2026-11-13T04:30:00.000Z",
      durationSeconds: 540,
      distance: 2,
      distanceUnit: "mi" as const,
      calories: 220,
    },
  ];

  const eastern = buildCardioPrReviewItems({ family: "cardio-endurance", timeZone: EASTERN, sessionAggregates });
  assert.ok(eastern.length > 0);
  assert.ok(eastern.every((item) => item.endsWith("| Nov 12")), eastern.join(" / "));

  const utc = buildCardioPrReviewItems({ family: "cardio-endurance", timeZone: "UTC", sessionAggregates });
  assert.ok(utc.every((item) => item.endsWith("| Nov 13")), utc.join(" / "));
});

test("contract: Exercise info no longer slices UTC ISO strings into day keys and resolves the History zone", () => {
  const exerciseInfoSource = readFileSync(new URL("./exercise-info.ts", import.meta.url), "utf8");
  const dayKeySource = readFileSync(new URL("./exercise-info-day-key.ts", import.meta.url), "utf8");
  const sheetSource = readFileSync(new URL("../components/ExerciseInfoSheet.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(exerciseInfoSource, /\.slice\(0,\s*10\)/);
  assert.doesNotMatch(dayKeySource, /\.slice\(0,\s*10\)/);
  assert.match(exerciseInfoSource, /return getExerciseInfoDayKey\(value, timeZone\);/);
  assert.match(dayKeySource, /getWeeklyProgressDayKey\(/);
  assert.match(exerciseInfoSource, /historyTimeZone: resolveHistoryTimeZone\(\{/);
  assert.doesNotMatch(exerciseInfoSource, /formatDateShort/);
  // Day keys are calendar dates: the client must format them in UTC, never through the browser zone.
  assert.doesNotMatch(sheetSource, /formatDateShort\(`\$\{(start|end)DayKey\}/);
});
