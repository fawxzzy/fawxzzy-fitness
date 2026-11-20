import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canShowProgressionCardAction } from "@/lib/progression-card-action";
import {
  buildManualPromotionTargetGuard,
  deriveManualPromotionBarPercent,
  evaluateManualPromotionGate,
  hasStandingPromotionForSourceSession,
  resolveManualPromotionLinkedIds,
  runManualPromotion,
  type ManualPromotionEventRow,
  type ManualPromotionExerciseSnapshot,
  type ManualPromotionGateInput,
  type ManualPromotionRepository,
} from "@/lib/progression-manual-promotion";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";

const USER = "user-a";
const OTHER_USER = "user-b";

function plan(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: 10,
    repsMin: 8,
    repsMax: 12,
    weightMin: 100,
    weightMax: 100,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    ...overrides,
  };
}

function sessionRows(reps: number, weight = 100, sessionRecordId = "session-1"): ProgressionHistorySetRow[] {
  return [1, 2, 3].map((setIndex) => ({
    sessionId: sessionRecordId,
    sessionRecordId,
    performedAt: "2026-11-18T12:00:00.000Z",
    setIndex,
    weight,
    reps,
    weightUnit: "lbs",
    isWarmup: false,
  }));
}

function candidateFor(target: ProgressionTargetPlan, rows: ProgressionHistorySetRow[]) {
  return deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: target,
    history: buildProgressionHistorySessions({
      rows,
      targetSetCount: target.setsMin ?? 3,
      topRepTarget: target.repsTarget ?? target.repsMax ?? 12,
      limit: 8,
    }),
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });
}

function appliedEvent(overrides: Partial<ManualPromotionEventRow> = {}): ManualPromotionEventRow {
  return {
    event_type: "promotion_applied",
    routine_day_exercise_id: "rde-1",
    source_session_id: "session-1",
    created_at: "2026-11-18T13:00:00.000Z",
    ...overrides,
  };
}

function readyGateInput(overrides: Partial<ManualPromotionGateInput> = {}): ManualPromotionGateInput {
  const target = plan();
  const rows = sessionRows(10);
  return {
    exerciseOwned: true,
    workoutInProgress: false,
    routineDayExerciseId: "rde-1",
    expectedFromTarget: target,
    acceptableCurrentTargets: [target],
    candidate: candidateFor(target, rows),
    barPercent: 100,
    sourceSessionId: "session-1",
    events: [],
    ...overrides,
  };
}

// --- Pure gate -------------------------------------------------------------------------------

test("gate: a ready promote on a full bar is allowed and returns the server-computed target", () => {
  const result = evaluateManualPromotionGate(readyGateInput());
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.proposedTarget.repsTarget, 11);
  assert.equal(result.ok && result.sourceSessionId, "session-1");
});

test("gate: a bar below 100% is refused even if the client claims promote", () => {
  const target = plan();
  const rows = sessionRows(9);
  const result = evaluateManualPromotionGate(readyGateInput({
    candidate: candidateFor(target, rows),
    barPercent: deriveManualPromotionBarPercent({ candidate: candidateFor(target, rows), plan: target, historyRows: rows }),
  }));
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.code, "bar_not_full");
  assert.equal(evaluateManualPromotionGate(readyGateInput({ barPercent: 99 })).ok, false);
});

test("gate: a full bar that is not a promote candidate (deload/none) is refused", () => {
  const candidate = { ...candidateFor(plan(), sessionRows(10)), type: "deload" as const };
  const result = evaluateManualPromotionGate(readyGateInput({ candidate }));
  assert.equal(!result.ok && result.code, "not_promote");
});

test("gate: another user's exercise is refused before anything else is checked", () => {
  const result = evaluateManualPromotionGate(readyGateInput({ exerciseOwned: false }));
  assert.equal(!result.ok && result.code, "not_owned");
});

test("gate: an in-progress workout refuses the promotion", () => {
  const result = evaluateManualPromotionGate(readyGateInput({ workoutInProgress: true }));
  assert.equal(!result.ok && result.code, "workout_in_progress");
});

test("gate: a stale expectedFromTarget is refused; stored or effort-schedule target both accepted", () => {
  const stale = evaluateManualPromotionGate(readyGateInput({ expectedFromTarget: plan({ repsTarget: 9 }) }));
  assert.equal(!stale.ok && stale.code, "stale_target");
  assert.equal(evaluateManualPromotionGate(readyGateInput({ expectedFromTarget: null })).ok, false);

  const effective = plan({ weightMin: 90, weightMax: 90 });
  const viaEffective = evaluateManualPromotionGate(readyGateInput({
    expectedFromTarget: effective,
    acceptableCurrentTargets: [plan(), effective],
  }));
  assert.equal(viaEffective.ok, true);
});

test("gate idempotency: a standing promotion_applied for the same exercise and workout refuses", () => {
  const result = evaluateManualPromotionGate(readyGateInput({ events: [appliedEvent()] }));
  assert.equal(!result.ok && result.code, "already_applied");
});

test("gate idempotency: revert after the promotion re-opens Promote; other sessions/exercises do not block", () => {
  const reverted = evaluateManualPromotionGate(readyGateInput({
    events: [appliedEvent(), appliedEvent({ event_type: "promotion_reverted", source_session_id: null, created_at: "2026-11-18T14:00:00.000Z" })],
  }));
  assert.equal(reverted.ok, true);
  assert.equal(evaluateManualPromotionGate(readyGateInput({ events: [appliedEvent({ source_session_id: "session-0" })] })).ok, true);
  assert.equal(evaluateManualPromotionGate(readyGateInput({ events: [appliedEvent({ routine_day_exercise_id: "rde-9" })] })).ok, true);
  assert.equal(hasStandingPromotionForSourceSession({ events: [appliedEvent()], routineDayExerciseId: "rde-1", sourceSessionId: null }), false);
});

test("double_progression phases: reps phase adds a rep at the same load; top of range adds load and resets reps", () => {
  const repsPhase = candidateFor(plan({ repsTarget: 10 }), sessionRows(10));
  assert.equal(repsPhase.type, "promote");
  assert.deepEqual(
    [repsPhase.proposedTarget?.repsTarget, repsPhase.proposedTarget?.weightMin],
    [11, 100],
  );

  const weightPhase = candidateFor(plan({ repsTarget: 12 }), sessionRows(12));
  assert.equal(weightPhase.type, "promote");
  assert.deepEqual(
    [weightPhase.proposedTarget?.repsTarget, weightPhase.proposedTarget?.weightMin, weightPhase.proposedTarget?.weightMax],
    [8, 105, 105],
  );

  const short = candidateFor(plan({ repsTarget: 10 }), sessionRows(9));
  assert.equal(short.type, "none");
  assert.ok(deriveManualPromotionBarPercent({ candidate: short, plan: plan(), historyRows: sessionRows(9) }) < 100);
});

test("card action: Promote shows only at a full bar; deload keeps its action", () => {
  assert.equal(canShowProgressionCardAction({ candidateType: "promote", progressPercent: 100 }), true);
  assert.equal(canShowProgressionCardAction({ candidateType: "promote", progressPercent: 96 }), false);
  assert.equal(canShowProgressionCardAction({ candidateType: "promote", progressPercent: null }), false);
  assert.equal(canShowProgressionCardAction({ candidateType: "deload", progressPercent: 40 }), true);
  assert.equal(canShowProgressionCardAction({ candidateType: "manual_review", progressPercent: 100 }), false);
  assert.equal(canShowProgressionCardAction({ candidateType: null, progressPercent: 100 }), false);
});

test("linked ids: dedupe, drop blanks and the source id, cap at the limit", () => {
  assert.deepEqual(resolveManualPromotionLinkedIds("rde-1", ["rde-1", " rde-2 ", "rde-2", "", "rde-3"]), ["rde-2", "rde-3"]);
  assert.equal(resolveManualPromotionLinkedIds("x", Array.from({ length: 30 }, (_, index) => `id-${index}`)).length, 12);
});

test("conditional-update guard covers every target column, nulls included", () => {
  const guard = buildManualPromotionTargetGuard({ target_sets: 3, target_reps: 10, target_weight: 100, target_weight_unit: "lbs" });
  assert.equal(guard.length, 10);
  assert.deepEqual(guard.find((entry) => entry.column === "target_reps"), { column: "target_reps", value: 10 });
  assert.deepEqual(guard.find((entry) => entry.column === "target_calories"), { column: "target_calories", value: null });
});

// --- Orchestration with an in-memory repository (fixtures for race / in-progress cases) -------

type FakeRow = { id: string; userId: string; target: ProgressionTargetPlan };

function createFakeRepo(args: {
  rows: FakeRow[];
  history: ProgressionHistorySetRow[];
  workoutInProgress?: boolean;
  /** Simulates another writer changing these ids between our read and our conditional write. */
  raceIds?: string[];
}) {
  const rows = new Map(args.rows.map((row) => [row.id, { ...row }]));
  const events: ManualPromotionEventRow[] = [];
  const writes: string[] = [];
  let clock = 0;

  const snapshot = (row: FakeRow): ManualPromotionExerciseSnapshot<FakeRow> => ({
    row,
    id: row.id,
    storedTarget: row.target,
    effectiveTarget: row.target,
  });

  const repo: ManualPromotionRepository<FakeRow> = {
    async readOwnedExercise(id) {
      const row = rows.get(id);
      return row && row.userId === USER ? snapshot({ ...row }) : null;
    },
    async hasWorkoutInProgress() {
      return Boolean(args.workoutInProgress);
    },
    async evaluate(exercise) {
      return { candidate: candidateFor(exercise.storedTarget, args.history), historyRows: args.history };
    },
    async readPromotionEvents(id) {
      return events.filter((event) => event.routine_day_exercise_id === id);
    },
    async readLinkedExercises(_source, linkedIds) {
      const linked = linkedIds.map((id) => rows.get(id));
      if (linked.some((row) => !row || row.userId !== USER)) {
        return null;
      }
      return linked.map((row) => snapshot({ ...(row as FakeRow) }));
    },
    async updateTargetIfUnchanged(exercise, nextTarget) {
      const current = rows.get(exercise.id);
      if (args.raceIds?.includes(exercise.id) && current) {
        current.target = { ...current.target, repsTarget: (current.target.repsTarget ?? 0) + 100 };
      }
      if (!current || JSON.stringify(current.target) !== JSON.stringify(exercise.storedTarget)) {
        return false;
      }
      current.target = nextTarget;
      writes.push(exercise.id);
      return true;
    },
    async recordPromotionApplied({ exercise, sourceSessionId }) {
      clock += 1;
      events.push({
        event_type: "promotion_applied",
        routine_day_exercise_id: exercise.id,
        source_session_id: sourceSessionId,
        created_at: `2026-11-19T00:00:0${clock}.000Z`,
      });
    },
  };

  return { repo, rows, events, writes };
}

test("run: promotes once, records promotion_applied with the source session, returns old/new for Revert", async () => {
  const fake = createFakeRepo({ rows: [{ id: "rde-1", userId: USER, target: plan() }], history: sessionRows(10) });
  const result = await runManualPromotion(fake.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan() });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.data.previousTarget.repsTarget, 10);
  assert.equal(result.ok && result.data.appliedTarget.repsTarget, 11);
  assert.equal(fake.rows.get("rde-1")?.target.repsTarget, 11);
  assert.deepEqual(fake.events.map((event) => [event.event_type, event.source_session_id]), [["promotion_applied", "session-1"]]);
});

test("run idempotency: a double submit writes once; the second tap is refused as already applied", async () => {
  const fake = createFakeRepo({ rows: [{ id: "rde-1", userId: USER, target: plan() }], history: sessionRows(10) });
  const request = { routineDayExerciseId: "rde-1", expectedFromTarget: plan() };
  const [first, second] = [await runManualPromotion(fake.repo, request), await runManualPromotion(fake.repo, request)];

  assert.equal(first.ok, true);
  assert.equal(!second.ok && second.code, "already_applied");
  assert.deepEqual(fake.writes, ["rde-1"]);
  assert.equal(fake.events.length, 1);
});

test("run: another user's exercise is refused with no write and no event", async () => {
  const fake = createFakeRepo({ rows: [{ id: "rde-1", userId: OTHER_USER, target: plan() }], history: sessionRows(10) });
  const result = await runManualPromotion(fake.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan() });
  assert.equal(!result.ok && result.code, "not_owned");
  assert.deepEqual([fake.writes.length, fake.events.length], [0, 0]);
});

test("run fixture: an in-progress workout refuses with no write", async () => {
  const fake = createFakeRepo({ rows: [{ id: "rde-1", userId: USER, target: plan() }], history: sessionRows(10), workoutInProgress: true });
  const result = await runManualPromotion(fake.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan() });
  assert.equal(!result.ok && result.code, "workout_in_progress");
  assert.deepEqual([fake.writes.length, fake.events.length], [0, 0]);
});

test("run: not at 100% and stale expectedFromTarget are both refused with no write", async () => {
  const short = createFakeRepo({ rows: [{ id: "rde-1", userId: USER, target: plan() }], history: sessionRows(9) });
  const notFull = await runManualPromotion(short.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan() });
  assert.equal(!notFull.ok && notFull.code, "bar_not_full");

  const ready = createFakeRepo({ rows: [{ id: "rde-1", userId: USER, target: plan() }], history: sessionRows(10) });
  const stale = await runManualPromotion(ready.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan({ repsTarget: 9 }) });
  assert.equal(!stale.ok && stale.code, "stale_target");
  assert.deepEqual([short.writes.length, ready.writes.length, ready.events.length], [0, 0, 0]);
});

test("run fixture: losing the conditional-update race writes nothing and records no event", async () => {
  const fake = createFakeRepo({ rows: [{ id: "rde-1", userId: USER, target: plan() }], history: sessionRows(10), raceIds: ["rde-1"] });
  const result = await runManualPromotion(fake.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan() });
  assert.equal(!result.ok && result.code, "lost_race");
  assert.deepEqual([fake.writes.length, fake.events.length], [0, 0]);
});

test("run: linked days are promoted together; a linked day that lost its race is skipped", async () => {
  const fake = createFakeRepo({
    rows: [
      { id: "rde-1", userId: USER, target: plan() },
      { id: "rde-2", userId: USER, target: plan() },
      { id: "rde-3", userId: USER, target: plan() },
    ],
    history: sessionRows(10),
    raceIds: ["rde-3"],
  });
  const result = await runManualPromotion(fake.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan(), linkedIds: ["rde-2", "rde-3"] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.data.linkedTargets?.map((target) => target.routineDayExerciseId), ["rde-1", "rde-2"]);
  assert.deepEqual(fake.writes, ["rde-1", "rde-2"]);

  const foreign = createFakeRepo({
    rows: [{ id: "rde-1", userId: USER, target: plan() }, { id: "rde-2", userId: OTHER_USER, target: plan() }],
    history: sessionRows(10),
  });
  const refused = await runManualPromotion(foreign.repo, { routineDayExerciseId: "rde-1", expectedFromTarget: plan(), linkedIds: ["rde-2"] });
  assert.equal(!refused.ok && refused.code, "linked_mismatch");
  assert.equal(foreign.writes.length, 0);
});

// --- Server action wiring (source contract; the Supabase repository is not unit-runnable) -----

test("promoteExerciseAction scopes every read and write to the signed-in user and checks all live workouts", async () => {
  const source = await readFile(new URL("../app/progression-review/actions.ts", import.meta.url), "utf8");
  const repoBlock = source.slice(source.indexOf("function createManualPromotionRepository"), source.indexOf("export async function promoteExerciseAction"));

  assert.match(source, /export async function promoteExerciseAction\(/);
  assert.match(repoBlock, /from\("routine_day_exercises"\)[\s\S]{0,200}\.eq\("id", routineDayExerciseId\)\s*\.eq\("user_id", userId\)/);
  assert.match(repoBlock, /from\("sessions"\)[\s\S]{0,120}\.eq\("user_id", userId\)\s*\.eq\("status", "in_progress"\)/);
  assert.match(repoBlock, /buildManualPromotionTargetGuard/);
  assert.match(source, /candidateType === "promote"[\s\S]{0,200}promoteExerciseAction\(/);
});
