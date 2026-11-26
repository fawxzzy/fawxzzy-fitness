import assert from "node:assert/strict";
import test from "node:test";
import { CREATE_ROUTINE_CLEANUP_FAILED_ERROR, createRoutineWithCleanup } from "./create-with-days-cleanup.ts";

function trackRemovals(ok = true) {
  const removed: string[] = [];
  return {
    removed,
    removeRoutine: async (routineId: string) => {
      removed.push(routineId);
      return { ok };
    },
  };
}

test("success passes through and removes nothing", async () => {
  const tracker = trackRemovals();
  const result = await createRoutineWithCleanup({
    create: async () => ({ ok: true, routineId: "r-1", firstDayId: "d-1" }),
    removeRoutine: tracker.removeRoutine,
  });
  assert.deepEqual(result, { ok: true, routineId: "r-1", firstDayId: "d-1" });
  assert.deepEqual(tracker.removed, []);
});

test("days insert fails after the routine row exists: the routine is removed, no routineId comes back", async () => {
  const tracker = trackRemovals();
  const result = await createRoutineWithCleanup({
    create: async () => ({ ok: false, error: "Could not add days.", routineId: "r-days" }),
    removeRoutine: tracker.removeRoutine,
  });
  assert.deepEqual(tracker.removed, ["r-days"]);
  assert.deepEqual(result, { ok: false, error: "Could not add days." });
  assert.equal("routineId" in result, false);
});

test("a rest-day update fails mid-way: the half-set routine is removed so a retry makes only one routine", async () => {
  const tracker = trackRemovals();
  const result = await createRoutineWithCleanup({
    create: async () => ({ ok: false, error: "Could not mark rest days.", routineId: "r-rest" }),
    removeRoutine: tracker.removeRoutine,
  });
  assert.deepEqual(tracker.removed, ["r-rest"]);
  assert.equal(result.ok, false);
  assert.equal("routineId" in result, false);
});

test("a failure before the row exists (cap, validation) removes nothing", async () => {
  const tracker = trackRemovals();
  const result = await createRoutineWithCleanup({
    create: async () => ({ ok: false, error: "Free plan: 1 routine." }),
    removeRoutine: tracker.removeRoutine,
  });
  assert.deepEqual(tracker.removed, []);
  assert.deepEqual(result, { ok: false, error: "Free plan: 1 routine." });
});

test("if the clean-up itself fails or throws, the message says to check routines before retrying", async () => {
  const failed = await createRoutineWithCleanup({
    create: async () => ({ ok: false, error: "x", routineId: "r-2" }),
    removeRoutine: trackRemovals(false).removeRoutine,
  });
  assert.deepEqual(failed, { ok: false, error: CREATE_ROUTINE_CLEANUP_FAILED_ERROR });

  const threw = await createRoutineWithCleanup({
    create: async () => ({ ok: false, error: "x", routineId: "r-3" }),
    removeRoutine: async () => {
      throw new Error("network");
    },
  });
  assert.deepEqual(threw, { ok: false, error: CREATE_ROUTINE_CLEANUP_FAILED_ERROR });
});
