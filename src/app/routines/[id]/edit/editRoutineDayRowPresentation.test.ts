import assert from "node:assert/strict";
import test from "node:test";

import { resolveEditRoutineDayRowPresentation } from "./editRoutineDayRowPresentation.ts";
import { REST_DAY_CARD_COPY } from "@/features/day-state/restDayCardCopy.ts";

test("resolveEditRoutineDayRowPresentation renders a deliberate rest-day card, not a generic empty state", () => {
  const result = resolveEditRoutineDayRowPresentation({
    isRest: true,
    summary: "",
    notes: null,
    needsSetup: false,
  });

  assert.deepEqual(result, {
    subtitle: REST_DAY_CARD_COPY,
    badgeText: "Rest",
    state: "empty",
  });
});

test("resolveEditRoutineDayRowPresentation does not conflate rest days with not-configured-yet days", () => {
  const restResult = resolveEditRoutineDayRowPresentation({
    isRest: true,
    summary: "",
    notes: null,
    needsSetup: false,
  });
  const needsSetupResult = resolveEditRoutineDayRowPresentation({
    isRest: false,
    summary: "",
    notes: null,
    needsSetup: true,
  });

  assert.notEqual(restResult.subtitle, needsSetupResult.subtitle);
  assert.notEqual(restResult.badgeText, needsSetupResult.badgeText);
  assert.equal(needsSetupResult.badgeText, "Needs Setup");
  assert.equal(needsSetupResult.state, "empty");
});

test("resolveEditRoutineDayRowPresentation is stable across consecutive rest days (independent per-row derivation)", () => {
  const days = [
    { isRest: true, summary: "", notes: null, needsSetup: false },
    { isRest: true, summary: "", notes: null, needsSetup: false },
    { isRest: false, summary: "3 exercises", notes: null, needsSetup: false },
  ];

  const results = days.map((day) => resolveEditRoutineDayRowPresentation(day));

  assert.equal(results[0].badgeText, "Rest");
  assert.equal(results[1].badgeText, "Rest");
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[2].badgeText, undefined);
  assert.equal(results[2].state, "default");
});

test("resolveEditRoutineDayRowPresentation is a pure, idempotent function of the persisted isRest flag (survives repeated calls / reloads)", () => {
  const day = { isRest: true, summary: "", notes: "Keep it light", needsSetup: false };

  const first = resolveEditRoutineDayRowPresentation(day);
  const second = resolveEditRoutineDayRowPresentation(day);
  const third = resolveEditRoutineDayRowPresentation({ ...day });

  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
});

test("resolveEditRoutineDayRowPresentation keeps a fully configured training day on the default (non-empty) state", () => {
  const result = resolveEditRoutineDayRowPresentation({
    isRest: false,
    summary: "3 strength",
    notes: "Focus on form",
    needsSetup: false,
  });

  assert.equal(result.state, "default");
  assert.equal(result.badgeText, undefined);
  assert.equal(result.subtitle, "3 strength • Focus on form");
});
