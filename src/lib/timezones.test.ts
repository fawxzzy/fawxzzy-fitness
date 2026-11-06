import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_HISTORY_TIMEZONE, resolveHistoryTimeZone } from "./timezones.ts";

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
