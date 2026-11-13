import assert from "node:assert/strict";
import test from "node:test";
import {
  generateAdaptiveCuratedWorkoutPlan,
  generateCuratedWorkoutPlan,
  type CuratedHistorySignals,
} from "./engine.ts";
import type { CuratedOnboardingData } from "./types.ts";

function intake(overrides: Partial<CuratedOnboardingData> = {}): CuratedOnboardingData {
  return {
    intakeResponses: {},
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
  const irrelevant = generateAdaptiveCuratedWorkoutPlan(intake(), signals({ failedExerciseSlugs: ["pike-push-up"] }));

  assert.deepEqual(irrelevant.days, baseline.days);
  assert.deepEqual(irrelevant.adjustments, []);
  assert.doesNotMatch(irrelevant.rationale.join(" "), /replaced \d+ exercise choice/);
});

test("when history flags every safe lift for a role the lift stays and the reason says so instead of failing", () => {
  // Bodyweight-only has exactly one core lift (Plank); flagging it must not abort generation.
  const plan = generateAdaptiveCuratedWorkoutPlan(
    intake({ daysPerWeek: 2, sessionLengthMinutes: 30, equipment: ["bodyweight"] }),
    signals({ fatiguedExerciseSlugs: ["plank"] }),
  );

  assert.ok(plan.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "plank"));
  const kept = plan.adjustments.find((adjustment) => adjustment.kind === "exercise-kept");
  assert.ok(kept && kept.kind === "exercise-kept");
  assert.equal(kept.exercise, "Plank");
  assert.match(kept.reason, /no safe alternative fits your equipment/i);
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

test("adjustments are deterministic for the same intake and signals", () => {
  const input = signals({ failedExerciseSlugs: ["barbell-row"], fatiguedExerciseSlugs: ["leg-press", "back-squat"] });
  const first = generateAdaptiveCuratedWorkoutPlan(intake(), input);
  const second = generateAdaptiveCuratedWorkoutPlan(structuredClone(intake()), structuredClone(input));

  assert.deepEqual(first, second);
});
