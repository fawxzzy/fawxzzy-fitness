import assert from "node:assert/strict";
import test from "node:test";
import { deriveCuratedExerciseTarget, formatCuratedExerciseTarget, generateAdaptiveCuratedWorkoutPlan, generateCuratedWorkoutPlan } from "./engine.ts";
import type { CuratedOnboardingData } from "./types.ts";

function intake(overrides: Partial<CuratedOnboardingData> = {}): CuratedOnboardingData {
  return {
    trainingGoal: "get-stronger",
    experience: "intermediate",
    daysPerWeek: 4,
    sessionLengthMinutes: 45,
    equipment: ["barbell", "bodyweight"],
    preferredStyle: "upper-lower",
    cardioPreference: "minimal",
    limitations: "",
    exerciseLikes: [],
    exerciseDislikes: [],
    targetAreas: [],
    ...overrides,
  };
}

test("curated engine generates a stable editable split with double progression", () => {
  const first = generateCuratedWorkoutPlan(intake());
  const second = generateCuratedWorkoutPlan(intake());

  assert.deepEqual(first, second);
  assert.equal(first.days.length, 4);
  assert.equal(first.progressionPlaybookId, "double_progression");
  assert.ok(first.days.every((day) => day.exercises.length <= 5));
  assert.ok(first.days.flatMap((day) => day.exercises).every((exercise) => exercise.progressionPlaybookId === "double_progression"));
  assert.ok(first.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "back-squat"));
  const fullGymPlan = generateCuratedWorkoutPlan(intake({ equipment: ["full-gym"] }));
  assert.ok(fullGymPlan.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "incline-walk" && exercise.targetDurationSeconds === 600));
});

test("curated engine substitutes exercises for bodyweight-only access", () => {
  const plan = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 2,
    sessionLengthMinutes: 30,
    equipment: ["bodyweight"],
  }));

  const slugs = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  assert.ok(slugs.includes("push-up"));
  assert.ok(slugs.includes("bodyweight-walking-lunge"));
  assert.ok(plan.days.every((day) => day.exercises.length === 4));
});

test("curated engine changes targets by goal and experience", () => {
  const strength = generateCuratedWorkoutPlan(intake());
  const beginnerMuscle = generateCuratedWorkoutPlan(intake({
    trainingGoal: "build-muscle",
    experience: "beginner",
  }));

  assert.equal(strength.days[0].exercises[0].targetSets, 4);
  assert.equal(strength.days[0].exercises[0].targetRepsMax, 6);
  assert.equal(beginnerMuscle.days[0].exercises[0].targetSets, 3);
  assert.equal(beginnerMuscle.days[0].exercises[0].targetRepsMin, 8);
});

test("curated engine rejects incomplete intake", () => {
  assert.throws(
    () => generateCuratedWorkoutPlan(intake({ equipment: [] })),
    /Complete goal, experience, equipment, schedule, and session length/,
  );
});

test("adaptive curated engine reduces an unsupported schedule with a visible reason", () => {
  const plan = generateAdaptiveCuratedWorkoutPlan(intake({ daysPerWeek: 5 }), {
    completionRate: 0.4,
    missedWorkoutCount: 3,
    failedExerciseSlugs: [],
    fatiguedExerciseSlugs: [],
  });
  assert.equal(plan.daysPerWeek, 4);
  assert.match(plan.rationale.join(" "), /instead of the requested 5/i);
});

test("adaptive curated engine swaps failed exercises within available equipment", () => {
  const plan = generateAdaptiveCuratedWorkoutPlan(intake({ equipment: ["full-gym"] }), {
    completionRate: 1,
    missedWorkoutCount: 0,
    failedExerciseSlugs: ["barbell-bench-press"],
    fatiguedExerciseSlugs: [],
    availableEquipment: ["full-gym"],
  });
  assert.equal(plan.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "barbell-bench-press"), false);
  assert.match(plan.rationale.join(" "), /equipment-compatible alternative/i);
});

test("curated engine deterministically excludes stated exercise constraints", () => {
  const disliked = generateCuratedWorkoutPlan(intake({
    equipment: ["full-gym"],
    exerciseDislikes: ["Back Squat"],
  }));
  const limited = generateCuratedWorkoutPlan(intake({
    equipment: ["full-gym"],
    limitations: "Avoid back squats due to knee pain.",
  }));

  assert.equal(disliked.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "back-squat"), false);
  assert.equal(limited.days.flatMap((day) => day.exercises).some((exercise) => exercise.slug === "back-squat"), false);
  assert.match(disliked.rationale.join(" "), /exercise exclusions removed/i);
});

test("curated engine fails safely when every equipment-compatible candidate is excluded", () => {
  assert.throws(
    () => generateCuratedWorkoutPlan(intake({
      daysPerWeek: 2,
      equipment: ["bodyweight"],
      exerciseDislikes: ["Plank"],
    })),
    /No safe core exercise matches/i,
  );
});

test("curated preview and draft target derivation agree for time-based exercises", () => {
  const plan = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 2,
    equipment: ["bodyweight"],
  }));
  const exercises = plan.days.flatMap((day) => day.exercises);
  const plank = exercises.find((exercise) => exercise.slug === "plank");
  const mountainClimber = exercises.find((exercise) => exercise.slug === "mountain-climber");

  assert.ok(plank);
  assert.ok(mountainClimber);
  assert.deepEqual(deriveCuratedExerciseTarget(plank), {
    measurementType: "time",
    targetRepsMin: null,
    targetRepsMax: null,
    targetDurationSeconds: 60,
  });
  assert.equal(formatCuratedExerciseTarget(plank), `${plank.targetSets}x1 min`);
  assert.equal(formatCuratedExerciseTarget(mountainClimber), `${mountainClimber.targetSets}x1 min`);
});
