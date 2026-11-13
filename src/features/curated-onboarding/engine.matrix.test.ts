import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCuratedRoutineSchedule,
  deriveCuratedExerciseTarget,
  resolveCuratedWorkoutPlan,
  type CuratedWorkoutPlan,
} from "./engine.ts";
import type {
  CuratedOnboardingData,
  EquipmentAccess,
  ExperienceLevel,
  PreferredStyle,
  TrainingGoal,
} from "./types.ts";
import { clearSafetyResponses } from "./test-fixtures.ts";

type CatalogExercise = { name: string; measurement_type: string };

const catalog: CatalogExercise[] = JSON.parse(
  readFileSync(new URL("../../../supabase/data/global_exercises_canonical.json", import.meta.url), "utf8"),
);
const catalogByName = new Map(catalog.map((exercise) => [exercise.name, exercise]));

const GOALS: TrainingGoal[] = ["build-muscle", "get-leaner", "get-stronger", "general-fitness"];
const EXPERIENCE: ExperienceLevel[] = ["beginner", "advanced"];
const SESSION_MINUTES = [30, 60, 90];
const STYLES: PreferredStyle[] = ["full-body", "upper-lower", "push-pull-legs", "hybrid"];
const EQUIPMENT_SETS: EquipmentAccess[][] = [
  ["full-gym"],
  ["full-gym", "dumbbells"],
  ["barbell"],
  ["barbell", "bodyweight"],
  ["dumbbells"],
  ["machines"],
  ["bands"],
  ["bodyweight"],
  ["dumbbells", "bands"],
];

function intake(overrides: Partial<CuratedOnboardingData>): CuratedOnboardingData {
  return {
    intakeResponses: clearSafetyResponses(),
    trainingGoal: "build-muscle",
    experience: "intermediate",
    daysPerWeek: 3,
    sessionLengthMinutes: 45,
    equipment: ["full-gym"],
    preferredStyle: "full-body",
    cardioPreference: "balanced",
    limitations: "",
    exerciseLikes: [],
    exerciseDislikes: [],
    targetAreas: [],
    ...overrides,
  };
}

function assertPlanInvariants(plan: CuratedWorkoutPlan, label: string) {
  assert.equal(plan.progressionPlaybookId, "double_progression", label);
  assert.equal(plan.days.length, plan.daysPerWeek, label);
  assert.match(plan.planId, /^curated-[0-9a-f]{8}$/, label);
  const exerciseLimit = plan.sessionLengthMinutes <= 30 ? 4 : plan.sessionLengthMinutes <= 45 ? 5 : plan.sessionLengthMinutes <= 60 ? 6 : 7;

  for (const day of plan.days) {
    assert.ok(day.exercises.length > 0, `${label} ${day.name} is empty`);
    assert.ok(day.exercises.length <= exerciseLimit, `${label} ${day.name} exceeds ${exerciseLimit}`);
    const slugs = day.exercises.map((exercise) => exercise.slug);
    assert.equal(new Set(slugs).size, slugs.length, `${label} ${day.name} repeats an exercise: ${slugs.join(",")}`);

    for (const exercise of day.exercises) {
      const catalogRow = catalogByName.get(exercise.name);
      assert.ok(catalogRow, `${label} ${exercise.name} is missing from the global exercise catalog`);
      assert.equal(exercise.progressionPlaybookId, "double_progression", label);
      assert.ok(exercise.targetSets >= 1 && exercise.targetSets <= 4, `${label} ${exercise.name} sets`);
      const target = deriveCuratedExerciseTarget(exercise);
      if (target.measurementType === "reps") {
        assert.equal(catalogRow.measurement_type, "reps", `${label} ${exercise.name} measurement`);
        assert.ok(target.targetRepsMin !== null && target.targetRepsMax !== null && target.targetRepsMin <= target.targetRepsMax);
      } else {
        assert.ok(["time", "time_distance"].includes(catalogRow.measurement_type), `${label} ${exercise.name} measurement`);
        assert.ok((target.targetDurationSeconds ?? 0) > 0);
      }
    }
  }

  const schedule = buildCuratedRoutineSchedule(plan);
  assert.equal(schedule.length, 7, label);
  assert.equal(schedule.filter((day) => day.planDay).length, plan.days.length, label);
}

test("every supported intake combination is deterministic, catalog-backed and either ready or a closed failure", () => {
  let ready = 0;
  let failed = 0;

  for (const trainingGoal of GOALS) {
    for (const experience of EXPERIENCE) {
      for (let daysPerWeek = 1; daysPerWeek <= 7; daysPerWeek += 1) {
        for (const sessionLengthMinutes of SESSION_MINUTES) {
          for (const preferredStyle of STYLES) {
            for (const equipment of EQUIPMENT_SETS) {
              const label = [trainingGoal, experience, `${daysPerWeek}d`, `${sessionLengthMinutes}m`, preferredStyle, equipment.join("+")].join(" ");
              const data = intake({ trainingGoal, experience, daysPerWeek, sessionLengthMinutes, preferredStyle, equipment });
              const first = resolveCuratedWorkoutPlan(data);
              const second = resolveCuratedWorkoutPlan(structuredClone(data));

              assert.deepEqual(first, second, `${label} is not deterministic`);
              if (first.status === "ready") {
                ready += 1;
                assertPlanInvariants(first.plan, label);
              } else {
                failed += 1;
                assert.equal(first.status, "failed", `${label} must fail closed, not block: ${JSON.stringify(first)}`);
                assert.ok(first.message.length > 0, label);
              }
            }
          }
        }
      }
    }
  }

  assert.ok(ready > 0);
  // Every equipment set that has any safe lift for each role must produce a routine; the matrix is mostly ready.
  assert.ok(ready > failed, `ready ${ready} must outnumber failed ${failed}`);
});

test("shuffling selection order never changes the generated routine", () => {
  for (const equipment of EQUIPMENT_SETS) {
    const forward = resolveCuratedWorkoutPlan(intake({ equipment, exerciseLikes: ["Dumbbell Bench Press", "Plank"], targetAreas: ["Glutes", "Chest"] }));
    const reversed = resolveCuratedWorkoutPlan(intake({
      equipment: [...equipment].reverse(),
      exerciseLikes: ["Plank", "Dumbbell Bench Press"],
      targetAreas: ["Chest", "Glutes"],
    }));
    assert.deepEqual(forward, reversed, equipment.join("+"));
  }
});
