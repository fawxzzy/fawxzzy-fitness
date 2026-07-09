import assert from "node:assert/strict";
import test from "node:test";

import {
  BASE_ROUTINE_LIMIT,
  BASE_SAVED_WORKOUT_PLAN_LIMIT,
  selectAccessibleRoutineIdsForTier,
  selectAccessibleWorkoutPlanTemplateIdsForTier,
} from "@/lib/pro-tier-limits";

test("Pro tier keeps all routines visible", () => {
  const routineIds = selectAccessibleRoutineIdsForTier({
    accessState: "pro",
    activeRoutineId: null,
    routines: [
      { id: "routine-1" },
      { id: "routine-2" },
      { id: "routine-3" },
      { id: "routine-4" },
    ],
  });

  assert.deepEqual([...routineIds], ["routine-1", "routine-2", "routine-3", "routine-4"]);
});

test("Base tier keeps the active routine and the next most recent routines up to the limit", () => {
  const routineIds = selectAccessibleRoutineIdsForTier({
    accessState: "free",
    activeRoutineId: "routine-older-active",
    routines: [
      { id: "routine-newest", updated_at: "2026-07-07T10:00:00.000Z" },
      { id: "routine-second", updated_at: "2026-07-06T10:00:00.000Z" },
      { id: "routine-older-active", updated_at: "2026-06-01T10:00:00.000Z" },
      { id: "routine-hidden", updated_at: "2026-07-05T10:00:00.000Z" },
    ],
  });

  assert.equal(routineIds.size, BASE_ROUTINE_LIMIT);
  assert.deepEqual([...routineIds], ["routine-older-active", "routine-newest", "routine-second"]);
});

test("Base tier keeps the most recent saved workout plans up to the saved-plan limit", () => {
  const templates = Array.from({ length: BASE_SAVED_WORKOUT_PLAN_LIMIT + 2 }, (_, index) => ({
    id: `template-${index + 1}`,
    updated_at: new Date(Date.UTC(2026, 6, index + 1)).toISOString(),
  }));

  const templateIds = selectAccessibleWorkoutPlanTemplateIdsForTier({
    accessState: "free",
    templates,
  });

  assert.equal(templateIds.size, BASE_SAVED_WORKOUT_PLAN_LIMIT);
  assert.equal(templateIds.has("template-16"), true);
  assert.equal(templateIds.has("template-15"), true);
  assert.equal(templateIds.has("template-1"), false);
  assert.equal(templateIds.has("template-2"), false);
});

