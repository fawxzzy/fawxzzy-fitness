import assert from "node:assert/strict";
import test from "node:test";
import {
  generateAdaptiveCuratedWorkoutPlan,
  generateCuratedWorkoutPlan,
  resolveCuratedWorkoutPlan,
  type CuratedHistorySignals,
  type CuratedPlanAdjustment,
  type CuratedWorkoutPlan,
} from "./engine.ts";
import { clearSafetyResponses } from "./test-fixtures.ts";
import type { CuratedOnboardingData, EquipmentAccess, TrainingGoal } from "./types.ts";

function intake(overrides: Partial<CuratedOnboardingData> = {}): CuratedOnboardingData {
  return {
    intakeResponses: clearSafetyResponses(),
    trainingGoal: "build-muscle",
    experience: "intermediate",
    daysPerWeek: 4,
    sessionLengthMinutes: 60,
    equipment: ["full-gym"],
    preferredStyle: "upper-lower",
    cardioPreference: "balanced",
    limitations: "",
    exerciseLikes: [],
    exerciseDislikes: [],
    targetAreas: [],
    ...overrides,
  };
}

function signals(overrides: Partial<CuratedHistorySignals> = {}): CuratedHistorySignals {
  return {
    completionRate: 0.9,
    missedWorkoutCount: 0,
    failedExerciseSlugs: [],
    fatiguedExerciseSlugs: [],
    ...overrides,
  };
}

function dayNames(plan: CuratedWorkoutPlan, dayName: string) {
  return plan.days.find((day) => day.name === dayName)?.exercises.map((exercise) => exercise.name) ?? [];
}

function mentions(adjustment: CuratedPlanAdjustment, name: string) {
  if (adjustment.kind === "schedule-reduced") return false;
  if (adjustment.kind === "exercise-swapped") return adjustment.from === name || adjustment.to === name;
  if (adjustment.kind === "day-adjusted") return adjustment.removed.includes(name) || adjustment.added.includes(name);
  return adjustment.exercise === name;
}

test("a first-time member gets a routine with no history adjustments and no history claim", () => {
  const plan = generateCuratedWorkoutPlan(intake());

  assert.deepEqual(plan.adjustments, []);
  assert.doesNotMatch(plan.rationale.join(" "), /last 28 days/);
});

test("a swap caused by session feedback names the exercise, the replacement, the day and the cause", () => {
  const plan = generateAdaptiveCuratedWorkoutPlan(
    intake(),
    signals({ failedExerciseSlugs: ["barbell-bench-press"] }),
  );
  const swaps = plan.adjustments.filter((adjustment) => adjustment.kind === "exercise-swapped");

  assert.ok(swaps.length > 0);
  for (const swap of swaps) {
    assert.equal(swap.kind, "exercise-swapped");
    if (swap.kind !== "exercise-swapped") continue;
    assert.equal(swap.cause, "failed-target");
    assert.equal(swap.from, "Barbell Bench Press");
    assert.notEqual(swap.to, swap.from);
    assert.match(swap.reason, /Barbell Bench Press/);
    assert.match(swap.reason, new RegExp(swap.to));
    assert.match(swap.reason, new RegExp(swap.dayName));
    const day = plan.days.find((candidate) => candidate.name === swap.dayName);
    assert.ok(day?.exercises.some((exercise) => exercise.name === swap.to), `${swap.to} is in ${swap.dayName}`);
    assert.equal(day?.exercises.some((exercise) => exercise.name === swap.from), false);
  }
  assert.match(plan.rationale.join(" "), /replaced 1 exercise choice where an equipment-compatible alternative existed/);
  assert.match(plan.rationale.join(" "), /Based on your last 28 days: 90% of planned workouts completed\./);
});

test("fatigue swaps are labeled as fatigue, and a failed-target signal wins when both apply", () => {
  const fatigue = generateAdaptiveCuratedWorkoutPlan(intake(), signals({ fatiguedExerciseSlugs: ["back-squat"] }));
  const fatigueSwap = fatigue.adjustments.find((adjustment) => adjustment.kind === "exercise-swapped");
  assert.ok(fatigueSwap && fatigueSwap.kind === "exercise-swapped");
  assert.equal(fatigueSwap.cause, "fatigue");

  const both = generateAdaptiveCuratedWorkoutPlan(
    intake(),
    signals({ failedExerciseSlugs: ["back-squat"], fatiguedExerciseSlugs: ["back-squat"] }),
  );
  const bothSwap = both.adjustments.find((adjustment) => adjustment.kind === "exercise-swapped");
  assert.ok(bothSwap && bothSwap.kind === "exercise-swapped");
  assert.equal(bothSwap.cause, "failed-target");
});

test("a lift marked as pain or a form breakdown is replaced with a visible reason and never kept", () => {
  const plan = generateAdaptiveCuratedWorkoutPlan(
    intake(),
    signals({ painOrFormExerciseSlugs: ["back-squat"] }),
  );
  const names = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.name));
  const swap = plan.adjustments.find((adjustment) => adjustment.kind === "exercise-swapped" && adjustment.from === "Back Squat");

  assert.equal(names.includes("Back Squat"), false);
  assert.ok(swap && swap.kind === "exercise-swapped");
  assert.equal(swap.cause, "pain-or-form");
  assert.match(swap.reason, /form breakdown or pain/);
  assert.doesNotMatch(swap.reason, /\bsafe\b/i);
});

test("a pain-flagged lift with no equipment alternative is OMITTED, not retained, and the day keeps its floor", () => {
  // Bodyweight-only members have exactly one core lift (Plank).
  const plan = generateAdaptiveCuratedWorkoutPlan(
    intake({ daysPerWeek: 2, sessionLengthMinutes: 60, equipment: ["bodyweight"], preferredStyle: "full-body" }),
    signals({ painOrFormExerciseSlugs: ["plank"] }),
  );

  assert.equal(plan.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "plank"), false);
  for (const day of plan.days) assert.ok(day.exercises.length >= 3, `${day.name} keeps the three-lift floor`);
  const omitted = plan.adjustments.find((adjustment) => adjustment.kind === "exercise-omitted");
  assert.ok(omitted && omitted.kind === "exercise-omitted");
  assert.equal(omitted.exercise, "Plank");
  assert.equal(omitted.cause, "pain-or-form");
  assert.match(omitted.reason, /left out of/);
  assert.doesNotMatch(omitted.reason, /\bsafe\b/i);
  assert.match(plan.rationale.join(" "), /left out 1 exercise marked as a form breakdown or pain/);
});

test("omitting pain-flagged lifts below the three-lift floor fails closed instead of padding the day", () => {
  const result = resolveCuratedWorkoutPlan(
    intake({ daysPerWeek: 2, sessionLengthMinutes: 30, equipment: ["bodyweight"], preferredStyle: "full-body" }),
    signals({ painOrFormExerciseSlugs: ["push-up", "pull-up", "bodyweight-walking-lunge", "glute-bridge", "plank"] }),
  );

  assert.equal(result.status, "failed");
  if (result.status === "failed") assert.match(result.message, /Too few exercises remain for|No exercises remain for/);
});

test("a too-hard lift with no alternative stays with a reason, but never one marked pain or form", () => {
  const kept = generateAdaptiveCuratedWorkoutPlan(
    intake({ daysPerWeek: 2, sessionLengthMinutes: 60, equipment: ["bodyweight"], preferredStyle: "full-body" }),
    signals({ failedExerciseSlugs: ["plank"], fatiguedExerciseSlugs: ["plank"] }),
  );
  const keptEntry = kept.adjustments.find((adjustment) => adjustment.kind === "exercise-kept");
  assert.ok(kept.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "plank"));
  assert.ok(keptEntry && keptEntry.kind === "exercise-kept");
  assert.match(keptEntry.reason, /too hard, but no other exercise fits your equipment/);
  assert.doesNotMatch(keptEntry.reason, /\bsafe\b/i);

  const flaggedBoth = generateAdaptiveCuratedWorkoutPlan(
    intake({ daysPerWeek: 2, sessionLengthMinutes: 60, equipment: ["bodyweight"], preferredStyle: "full-body" }),
    signals({ failedExerciseSlugs: ["plank"], fatiguedExerciseSlugs: ["plank"], painOrFormExerciseSlugs: ["plank"] }),
  );
  assert.equal(flaggedBoth.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "plank"), false);
});

test("a reduced schedule is reported as a structured adjustment with the same reason as the rationale", () => {
  const plan = generateAdaptiveCuratedWorkoutPlan(
    intake({ daysPerWeek: 5 }),
    signals({ completionRate: 0.4, missedWorkoutCount: 3 }),
  );
  const reduced = plan.adjustments.find((adjustment) => adjustment.kind === "schedule-reduced");

  assert.ok(reduced && reduced.kind === "schedule-reduced");
  assert.equal(reduced.requestedDays, 5);
  assert.equal(reduced.days, 4);
  assert.ok(plan.rationale.includes(reduced.reason));
  assert.match(plan.rationale.join(" "), /40% of planned workouts completed/);
});

test("signals about exercises the routine never contained change nothing and claim nothing", () => {
  const baseline = generateAdaptiveCuratedWorkoutPlan(intake(), signals());
  const irrelevant = generateAdaptiveCuratedWorkoutPlan(
    intake(),
    signals({ failedExerciseSlugs: ["pike-push-up"], painOrFormExerciseSlugs: ["inverted-row"] }),
  );

  assert.deepEqual(irrelevant.days, baseline.days);
  assert.deepEqual(irrelevant.adjustments, []);
  assert.doesNotMatch(irrelevant.rationale.join(" "), /replaced \d+ exercise choice|left out/);
});

test("avoided equipment swaps are explained per exercise", () => {
  const plan = generateCuratedWorkoutPlan(intake({ avoidedEquipment: ["machines"] }));
  const swaps = plan.adjustments.filter((adjustment) => adjustment.kind === "exercise-swapped");

  assert.ok(swaps.length > 0);
  for (const swap of swaps) {
    assert.ok(swap.kind === "exercise-swapped");
    assert.equal(swap.cause, "avoided-equipment");
    assert.match(swap.reason, /asked to avoid the equipment/);
  }
});

test("a cascade the role-level rules do not name is still named at the day level", () => {
  // Reviewer repro: Single-Arm Dumbbell Row -> Inverted Row, then Plank appears, with no entry for either.
  const plan = generateAdaptiveCuratedWorkoutPlan(
    intake({ daysPerWeek: 3, sessionLengthMinutes: 45, equipment: ["bodyweight", "dumbbells"], preferredStyle: "full-body" }),
    signals({ fatiguedExerciseSlugs: ["single-arm-dumbbell-row"], painOrFormExerciseSlugs: ["pull-up"] }),
  );
  const baseline = generateCuratedWorkoutPlan(
    intake({ daysPerWeek: 3, sessionLengthMinutes: 45, equipment: ["bodyweight", "dumbbells"], preferredStyle: "full-body" }),
  );

  for (const day of plan.days) {
    const before = dayNames(baseline, day.name);
    const after = day.exercises.map((exercise) => exercise.name);
    for (const name of [...before.filter((entry) => !after.includes(entry)), ...after.filter((entry) => !before.includes(entry))]) {
      assert.ok(
        plan.adjustments.some((adjustment) => "dayName" in adjustment && adjustment.dayName === day.name && mentions(adjustment, name)),
        `${day.name}: ${name} changed with no adjustment naming it`,
      );
    }
  }
});

test("adjustments are deterministic for the same intake and signals", () => {
  const input = signals({
    failedExerciseSlugs: ["barbell-row"],
    fatiguedExerciseSlugs: ["leg-press", "back-squat"],
    painOrFormExerciseSlugs: ["walking-lunge"],
  });
  const first = generateAdaptiveCuratedWorkoutPlan(intake(), input);
  const second = generateAdaptiveCuratedWorkoutPlan(structuredClone(intake()), structuredClone(input));

  assert.deepEqual(first, second);
});

// ---- property test: every difference from the first-choice day is named by an adjustment ---------------------------

const SLUG_POOL = [
  "back-squat", "leg-press", "goblet-squat", "bodyweight-walking-lunge", "romanian-deadlift", "single-leg-romanian-deadlift",
  "smith-machine-romanian-deadlift", "glute-bridge", "barbell-bench-press", "dumbbell-bench-press", "smith-machine-bench-press",
  "push-up", "overhead-press", "seated-dumbbell-shoulder-press", "machine-shoulder-press", "pike-push-up", "barbell-row",
  "single-arm-dumbbell-row", "seated-cable-row", "inverted-row", "lat-pulldown", "pull-up", "walking-lunge", "reverse-lunge",
  "single-leg-press", "plank", "incline-walk", "mountain-climber",
];
const EQUIPMENT_POOL: EquipmentAccess[][] = [
  ["full-gym"], ["barbell"], ["dumbbells"], ["machines"], ["bands"], ["bodyweight"],
  ["bodyweight", "dumbbells"], ["barbell", "bodyweight"], ["dumbbells", "bands"], ["full-gym", "dumbbells"],
];
const GOALS: TrainingGoal[] = ["build-muscle", "get-leaner", "get-stronger", "general-fitness"];

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("fuzz: no exercise appears in or disappears from a day relative to its first choice without an adjustment naming it", () => {
  const random = seeded(20261112);
  function pick<T>(values: T[]): T {
    return values[Math.floor(random() * values.length)];
  }
  const subset = (count: number) => {
    const chosen = new Set<string>();
    for (let index = 0; index < count; index += 1) chosen.add(pick(SLUG_POOL));
    return [...chosen];
  };
  let compared = 0;
  let withAdjustments = 0;
  let cascades = 0;

  for (let iteration = 0; iteration < 4000; iteration += 1) {
    const data = intake({
      trainingGoal: pick(GOALS),
      experience: pick(["beginner", "intermediate", "advanced"] as const),
      daysPerWeek: 1 + Math.floor(random() * 7),
      sessionLengthMinutes: pick([30, 45, 60, 90]),
      equipment: pick(EQUIPMENT_POOL),
      preferredStyle: pick(["full-body", "upper-lower", "push-pull-legs", "hybrid"] as const),
      avoidedEquipment: random() < 0.25 ? pick<EquipmentAccess[]>([["machines"], ["barbell"], ["dumbbells"], ["bands"]]) : [],
    });
    const history = signals({
      completionRate: 0.9,
      failedExerciseSlugs: subset(Math.floor(random() * 4)),
      fatiguedExerciseSlugs: subset(Math.floor(random() * 4)),
      painOrFormExerciseSlugs: subset(Math.floor(random() * 3)),
    });

    const withSignals = resolveCuratedWorkoutPlan(data, history);
    const withoutSignals = resolveCuratedWorkoutPlan({ ...data, avoidedEquipment: [] });
    if (withSignals.status !== "ready" || withoutSignals.status !== "ready") continue;
    compared += 1;

    // The first-choice day is the routine built from the member's own limitations and dislikes alone, on the same split.
    const plan = withSignals.plan;
    const baselineResult = withoutSignals.plan.daysPerWeek === plan.daysPerWeek
      ? withoutSignals
      : resolveCuratedWorkoutPlan({ ...data, avoidedEquipment: [], daysPerWeek: plan.daysPerWeek });
    if (baselineResult.status !== "ready") continue;
    const baselinePlan = baselineResult.plan;
    if (plan.adjustments.length > 0) withAdjustments += 1;
    if (plan.adjustments.some((adjustment) => adjustment.kind === "day-adjusted")) cascades += 1;

    for (const day of plan.days) {
      const before = dayNames(baselinePlan, day.name);
      const after = day.exercises.map((exercise) => exercise.name);
      const changed = [...before.filter((name) => !after.includes(name)), ...after.filter((name) => !before.includes(name))];
      for (const name of changed) {
        assert.ok(
          plan.adjustments.some((adjustment) => "dayName" in adjustment && adjustment.dayName === day.name && mentions(adjustment, name)),
          `iteration ${iteration} ${day.name}: ${name} changed with no adjustment naming it (${JSON.stringify(history)})`,
        );
      }
      // Pain or form feedback is never kept in a day.
      for (const exercise of day.exercises) {
        assert.equal((history.painOrFormExerciseSlugs ?? []).includes(exercise.slug), false, `iteration ${iteration} kept ${exercise.slug}`);
      }
    }
  }

  assert.ok(compared > 2000, `compared ${compared} intakes`);
  assert.ok(withAdjustments > 200, `only ${withAdjustments} intakes produced adjustments`);
  assert.ok(cascades > 0, 'the property must exercise at least one day-level cascade entry');
});
