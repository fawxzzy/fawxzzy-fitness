import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDayTaxonomyInfoRailItems,
  buildRoutineBrowseInfoRailItems,
} from "@/lib/header-info-rail";

test("day taxonomy rail items keep a stable category order and omit zero counts", () => {
  assert.deepEqual(
    buildDayTaxonomyInfoRailItems({
      strength: 3,
      cardio: 2,
      bodyweight: 1,
      unknown: 0,
    }).map((item) => item.id),
    ["strength", "cardio", "bodyweight"],
  );
});

test("routine browse rail keeps active routine first and total second", () => {
  assert.deepEqual(
    buildRoutineBrowseInfoRailItems({
      activeRoutineName: "Pull",
      routineCount: 4,
    }).map((item) => item.id),
    ["active-routine", "routine-count"],
  );
});
