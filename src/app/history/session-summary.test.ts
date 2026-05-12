import test from "node:test";
import assert from "node:assert/strict";
import { buildSessionSummary } from "@/app/history/session-summary";
import type { SessionRow } from "@/types/db";

test("history detail summary uses session performed_at as the display date source", () => {
  const sessionRow: SessionRow = {
    id: "session-1",
    user_id: "user-1",
    performed_at: "2026-04-16T14:30:00.000Z",
    notes: null,
    routine_id: "routine-1",
    routine_day_index: 2,
    name: "Atlas",
    routine_day_name: "Forge",
    day_name_override: null,
    duration_seconds: 1800,
    status: "completed",
  };

  const summary = buildSessionSummary({
    sessionRow,
    routineTitle: "Atlas",
    dayTitle: "Forge",
    sessionExercises: [],
    setsBySessionExerciseId: new Map(),
    exerciseNameById: new Map(),
    prCounts: { weight: 0, reps: 0, total: 0 },
  });

  assert.equal(summary.startedAt, "2026-04-16T14:30:00.000Z");
  assert.equal(summary.dayTitle, "Forge");
});
