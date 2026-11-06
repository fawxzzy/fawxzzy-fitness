import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_HISTORY_TIMEZONE,
  isRoutineTimezone,
  normalizeRoutineTimezone,
  resolveHistoryTimeZone,
  toCanonicalRoutineTimezone,
} from "./timezones.ts";

test("device zones outside the picker presets are kept, not collapsed to Eastern or UTC", () => {
  for (const zone of ["America/Phoenix", "Pacific/Honolulu", "America/Anchorage", "Europe/London", "Asia/Tokyo", "Australia/Sydney"]) {
    assert.equal(normalizeRoutineTimezone(zone), zone);
    assert.equal(toCanonicalRoutineTimezone(zone), zone);
    assert.equal(isRoutineTimezone(zone), true);
  }
});

test("preset aliases still fold into their preset and invalid zones are rejected or defaulted", () => {
  assert.equal(normalizeRoutineTimezone("America/Toronto"), "America/New_York");
  assert.equal(normalizeRoutineTimezone("America/Vancouver"), "America/Los_Angeles");
  assert.equal(normalizeRoutineTimezone("Not/AZone"), DEFAULT_HISTORY_TIMEZONE);
  assert.equal(normalizeRoutineTimezone(null), DEFAULT_HISTORY_TIMEZONE);
  assert.equal(toCanonicalRoutineTimezone("Not/AZone"), null);
  assert.equal(isRoutineTimezone("Not/AZone"), false);
});

test("the active routine's device-derived timezone outranks a server-captured profile timezone", () => {
  assert.equal(
    resolveHistoryTimeZone({ activeRoutineTimeZone: "America/New_York", profileTimeZone: "UTC" }),
    "America/New_York",
  );
});

test("history falls back to the profile timezone, then the default, and ignores invalid zones", () => {
  assert.equal(resolveHistoryTimeZone({ activeRoutineTimeZone: null, profileTimeZone: "America/Chicago" }), "America/Chicago");
  assert.equal(resolveHistoryTimeZone({ activeRoutineTimeZone: "Not/AZone", profileTimeZone: "America/Denver" }), "America/Denver");
  assert.equal(resolveHistoryTimeZone({ activeRoutineTimeZone: "", profileTimeZone: "  " }), DEFAULT_HISTORY_TIMEZONE);
  assert.equal(resolveHistoryTimeZone({}), DEFAULT_HISTORY_TIMEZONE);
});
