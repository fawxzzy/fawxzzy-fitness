import assert from "node:assert/strict";
import test from "node:test";
import { buildCuratedRoutineSchedule, deriveCuratedExerciseTarget, formatCuratedExerciseTarget, generateAdaptiveCuratedWorkoutPlan, generateCuratedWorkoutPlan } from "./engine.ts";
import { createBeginnerPlanetFitness4DayMuscleGainFixture } from "./planning-fixtures.ts";
import type { CuratedOnboardingData } from "./types.ts";

function intake(overrides: Partial<CuratedOnboardingData> = {}): CuratedOnboardingData {
  return {
    intakeResponses: {},
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

test("curated engine supports the full one-to-seven day intake range", () => {
  const oneDay = generateCuratedWorkoutPlan(intake({ daysPerWeek: 1 }));
  const sevenDay = generateCuratedWorkoutPlan(intake({ daysPerWeek: 7 }));

  assert.equal(oneDay.days.length, 1);
  assert.equal(oneDay.days[0].name, "Full Body");
  assert.equal(sevenDay.days.length, 7);
  assert.equal(sevenDay.days[6].name, "Conditioning + Core");
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

test("curated engine maps common limitation language to unsafe movement roles", () => {
  const plan = generateCuratedWorkoutPlan(intake({
    equipment: ["full-gym"],
    limitations: "Shoulder irritation overhead",
  }));
  const slugs = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));

  assert.equal(slugs.includes("overhead-press"), false);
  assert.equal(slugs.includes("seated-dumbbell-shoulder-press"), false);
  assert.equal(slugs.includes("machine-shoulder-press"), false);
  assert.match(plan.rationale.join(" "), /limitations or exercise exclusions removed/i);
});

test("curated engine omits roles without an equipment-compatible safe candidate", () => {
  const plan = generateCuratedWorkoutPlan(intake({
    equipment: ["barbell"],
    limitations: "Shoulder irritation overhead",
  }));
  const slugs = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));

  assert.equal(slugs.includes("overhead-press"), false);
  assert.equal(slugs.includes("pike-push-up"), false);
  assert.equal(slugs.includes("seated-dumbbell-shoulder-press"), false);
  assert.equal(slugs.includes("machine-shoulder-press"), false);
  assert.ok(plan.days.every((day) => day.exercises.length > 0));
});

test("curated engine rejects a schedule containing an empty filtered workout day", () => {
  assert.throws(
    () => generateCuratedWorkoutPlan(intake({
      equipment: ["barbell"],
      limitations: "Avoid Barbell Bench Press, Overhead Press, Barbell Row, and Plank.",
    })),
    /No safe exercises remain for Upper A\. Adjust the selected equipment or constraints/i,
  );
});

test("curated engine deterministically prioritizes exercise likes and target areas", () => {
  const baseline = generateCuratedWorkoutPlan(intake({
    equipment: ["full-gym", "bodyweight"],
  }));
  const preferred = generateCuratedWorkoutPlan(intake({
    equipment: ["full-gym", "bodyweight"],
    exerciseLikes: ["Dumbbell Bench Press"],
    targetAreas: ["Glutes"],
  }));
  const baselineSlugs = baseline.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  const preferredSlugs = preferred.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));

  assert.ok(baselineSlugs.includes("barbell-bench-press"));
  assert.ok(preferredSlugs.includes("dumbbell-bench-press"));
  assert.ok(preferredSlugs.includes("single-leg-romanian-deadlift") || preferredSlugs.includes("glute-bridge"));
  assert.notDeepEqual(preferredSlugs, baselineSlugs);
  assert.match(preferred.rationale.join(" "), /preferred exercises and target areas/i);
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

test("curated routine schedule preserves weekly frequency with explicit rest days", () => {
  const plan = generateCuratedWorkoutPlan(intake({ daysPerWeek: 3 }));
  const schedule = buildCuratedRoutineSchedule(plan);

  assert.equal(schedule.length, 7);
  assert.deepEqual(
    schedule.filter((day) => day.planDay).map((day) => day.dayIndex),
    [1, 3, 5],
  );
  assert.deepEqual(
    schedule.filter((day) => !day.planDay).map((day) => day.dayIndex),
    [2, 4, 6, 7],
  );
  assert.deepEqual(
    schedule.flatMap((day) => day.planDay?.name ?? []),
    plan.days.map((day) => day.name),
  );
});

test("golden Planet Fitness fixture honors exact weekdays and precise equipment truth", () => {
  const data = createBeginnerPlanetFitness4DayMuscleGainFixture();
  const first = generateCuratedWorkoutPlan(data);
  const second = generateCuratedWorkoutPlan(data);
  const adaptive = generateAdaptiveCuratedWorkoutPlan(data, {
    completionRate: 1,
    missedWorkoutCount: 0,
    failedExerciseSlugs: [],
    fatiguedExerciseSlugs: [],
    availableEquipment: ["full-gym"],
  });
  const schedule = buildCuratedRoutineSchedule(first);
  const slugs = first.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  const adaptiveSlugs = adaptive.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  const freeBarbellSlugs = [
    "back-squat",
    "barbell-bench-press",
    "overhead-press",
    "barbell-row",
    "romanian-deadlift",
  ];

  assert.deepEqual(first, second);
  assert.equal(first.version, 2);
  assert.deepEqual(first.trainingDayIndexes, [2, 4, 6, 7]);
  assert.deepEqual(
    schedule.filter((day) => day.planDay).map((day) => day.dayIndex),
    [2, 4, 6, 7],
  );
  assert.deepEqual(
    schedule.filter((day) => !day.planDay).map((day) => day.dayIndex),
    [1, 3, 5],
  );
  assert.equal(
    slugs.some((slug) => freeBarbellSlugs.includes(slug)),
    false,
  );
  assert.equal(
    adaptiveSlugs.some((slug) => freeBarbellSlugs.includes(slug)),
    false,
  );
  assert.ok(slugs.includes("leg-press"));
  assert.equal(first.provenance.planningDigest.length, 64);
  assert.match(first.rationale.join(" "), /exact selected weekdays/i);
});

test("curated engine fails closed instead of widening treadmill-only access", () => {
  assert.throws(
    () => generateCuratedWorkoutPlan(
      createBeginnerPlanetFitness4DayMuscleGainFixture({
        availableEquipment: ["treadmill"],
      }),
    ),
    /No safe exercises remain for Upper A/i,
  );
});

test("curated engine enforces explicit machine avoidance before selection", () => {
  const plan = generateCuratedWorkoutPlan(
    createBeginnerPlanetFitness4DayMuscleGainFixture({
      equipmentAvoid: "machines",
    }),
  );
  const slugs = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  const machineSlugs = new Set([
    "leg-press",
    "smith-machine-romanian-deadlift",
    "smith-machine-bench-press",
    "machine-shoulder-press",
    "seated-cable-row",
    "lat-pulldown",
    "single-leg-press",
    "incline-walk",
  ]);

  assert.equal(slugs.some((slug) => machineSlugs.has(slug)), false);
  assert.ok(slugs.includes("goblet-squat"));
  assert.ok(slugs.includes("dumbbell-bench-press"));
});

test("curated engine fails closed before selection when planning safety is blocked", () => {
  assert.throws(
    () => generateCuratedWorkoutPlan(createBeginnerPlanetFitness4DayMuscleGainFixture({
      warningSymptoms: ["dizziness"],
    })),
    /warning-symptoms-require-clearance/i,
  );
});
