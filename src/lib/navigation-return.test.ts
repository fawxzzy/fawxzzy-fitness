import test from "node:test";
import assert from "node:assert/strict";

import { getSafeReturnContract, resolvePreferredReturnHref } from "./navigation-return.ts";
import { getRoutineDayEditHref, resolveRoutineDayEditBackHref, resolveRoutineDayViewBackHref } from "./routine-day-navigation.ts";

test("getSafeReturnContract prefers prior safe in-app history entries", () => {
  assert.deepEqual(
    getSafeReturnContract("/session/abc", ["/today", "/session/abc"], "/history"),
    {
      historyHref: "/today",
      fallbackReturnHref: "/history",
      returnHref: "/today",
      useHistoryBack: true,
    },
  );
});

test("resolvePreferredReturnHref honors an explicit safe return target before fallback", () => {
  assert.equal(
    resolvePreferredReturnHref({
      requestedReturnTo: "/routines/1/days/2",
      currentPath: "/routines/1/edit/day/2?returnTo=%2Froutines%2F1%2Fdays%2F2",
      stack: [],
      fallbackHref: "/routines/1/edit",
    }),
    "/routines/1/days/2",
  );
});

test("resolvePreferredReturnHref ignores unsafe or self-referential return targets", () => {
  assert.equal(
    resolvePreferredReturnHref({
      requestedReturnTo: "https://example.com/phish",
      currentPath: "/session/abc",
      stack: ["/today", "/session/abc"],
      fallbackHref: "/history",
    }),
    "/today",
  );

  assert.equal(
    resolvePreferredReturnHref({
      requestedReturnTo: "/session/abc",
      currentPath: "/session/abc",
      stack: [],
      fallbackHref: "/today",
    }),
    "/today",
  );
});

test("routine day view back falls back to routines when returnTo is missing or unsafe", () => {
  assert.equal(resolveRoutineDayViewBackHref(undefined), "/routines");
  assert.equal(resolveRoutineDayViewBackHref("https://example.com/phish"), "/routines");
});

test("routine day edit back prefers day view and blocks edit-route loops", () => {
  assert.equal(
    resolveRoutineDayEditBackHref("routine-1", "day-2", "%2Froutines%2Froutine-1%2Fdays%2Fday-2"),
    "/routines/routine-1/days/day-2",
  );

  assert.equal(resolveRoutineDayEditBackHref("routine-1", "day-2", undefined), "/routines/routine-1/days/day-2");
  assert.equal(
    resolveRoutineDayEditBackHref("routine-1", "day-2", "%2Froutines%2Froutine-1%2Fedit"),
    "/routines/routine-1/days/day-2",
  );
});

test("routine day edit href keeps only safe non-self returnTo targets", () => {
  assert.equal(
    getRoutineDayEditHref("routine-1", "day-2", "/routines/routine-1/days/day-2"),
    "/routines/routine-1/edit/day/day-2?returnTo=%2Froutines%2Froutine-1%2Fdays%2Fday-2",
  );

  assert.equal(
    getRoutineDayEditHref("routine-1", "day-2", "https://example.com/phish"),
    "/routines/routine-1/edit/day/day-2",
  );
});
