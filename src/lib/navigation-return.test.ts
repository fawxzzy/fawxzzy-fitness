import test from "node:test";
import assert from "node:assert/strict";

import { getSafeReturnContract, resolvePreferredReturnHref } from "./navigation-return.ts";

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
