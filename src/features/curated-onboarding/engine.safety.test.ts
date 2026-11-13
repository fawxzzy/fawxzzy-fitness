import assert from "node:assert/strict";
import test from "node:test";
import {
  CuratedPlanBlockedError,
  evaluateCuratedSafetyGate,
  generateAdaptiveCuratedWorkoutPlan,
  generateCuratedWorkoutPlan,
  resolveCuratedWorkoutPlan,
} from "./engine.ts";
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

test("warning symptoms block generation instead of producing a routine", () => {
  const symptomatic = intake({ intakeResponses: { warningSymptoms: ["dizziness", "chest-pain"] } });

  assert.deepEqual(evaluateCuratedSafetyGate(symptomatic), {
    status: "clearance-required",
    symptoms: ["chest-pain", "dizziness"],
  });
  assert.throws(() => generateCuratedWorkoutPlan(symptomatic), CuratedPlanBlockedError);
  assert.throws(
    () => generateAdaptiveCuratedWorkoutPlan(symptomatic, {
      completionRate: 1,
      missedWorkoutCount: 0,
      failedExerciseSlugs: [],
      fatiguedExerciseSlugs: [],
    }),
    CuratedPlanBlockedError,
  );

  const result = resolveCuratedWorkoutPlan(symptomatic);
  assert.equal(result.status, "blocked");
  if (result.status === "blocked") {
    assert.equal(result.reason, "safety-clearance-required");
    assert.deepEqual(result.symptoms, ["chest-pain", "dizziness"]);
    assert.match(result.message, /qualified professional/i);
  }
});

test("a clear, an absent and a contradictory safety answer are handled deterministically", () => {
  assert.equal(evaluateCuratedSafetyGate(intake({ intakeResponses: { warningSymptoms: ["none"] } })).status, "clear");
  assert.equal(evaluateCuratedSafetyGate(intake()).status, "clear");
  assert.equal(resolveCuratedWorkoutPlan(intake({ intakeResponses: { warningSymptoms: ["none"] } })).status, "ready");
  // "none" together with a symptom fails closed, and so does a free-text "other" symptom.
  assert.equal(
    evaluateCuratedSafetyGate(intake({ intakeResponses: { warningSymptoms: ["none", "palpitations"] } })).status,
    "clearance-required",
  );
  assert.equal(
    evaluateCuratedSafetyGate(intake({ intakeResponses: { warningSymptoms: ["other"] } })).status,
    "clearance-required",
  );
});

test("resolveCuratedWorkoutPlan returns closed failed outcomes instead of throwing", () => {
  const incomplete = resolveCuratedWorkoutPlan(intake({ equipment: [] }));
  assert.equal(incomplete.status, "failed");
  if (incomplete.status === "failed") assert.equal(incomplete.reason, "incomplete-intake");

  const noSafePlan = resolveCuratedWorkoutPlan(intake({
    daysPerWeek: 2,
    equipment: ["bodyweight"],
    exerciseDislikes: ["Plank"],
  }));
  assert.equal(noSafePlan.status, "failed");
  if (noSafePlan.status === "failed") {
    assert.equal(noSafePlan.reason, "no-safe-plan");
    assert.match(noSafePlan.message, /No safe core exercise/i);
  }
});

test("one exercise never repeats inside a single day, even when two roles share a lift", () => {
  for (const equipment of [["bodyweight"], ["bands"], ["dumbbells"], ["machines"], ["barbell"]] as const) {
    const plan = generateCuratedWorkoutPlan(intake({ daysPerWeek: 4, equipment: [...equipment] }));
    for (const day of plan.days) {
      const slugs = day.exercises.map((exercise) => exercise.slug);
      assert.equal(new Set(slugs).size, slugs.length, `${equipment.join("+")} ${day.name}: ${slugs.join(",")}`);
    }
  }
});

test("equipment the member asked to avoid removes only the lifts that need it", () => {
  const baseline = generateCuratedWorkoutPlan(intake({ equipment: ["full-gym"], daysPerWeek: 4 }));
  const avoidMachines = generateCuratedWorkoutPlan(intake({
    equipment: ["full-gym"],
    daysPerWeek: 4,
    avoidedEquipment: ["machines"],
  }));
  const machineOnly = [
    "leg-press",
    "lat-pulldown",
    "seated-cable-row",
    "machine-shoulder-press",
    "smith-machine-bench-press",
    "incline-walk",
  ];
  const baselineSlugs = baseline.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));
  const avoidSlugs = avoidMachines.days.flatMap((day) => day.exercises.map((exercise) => exercise.slug));

  assert.ok(baselineSlugs.some((slug) => machineOnly.includes(slug)));
  assert.equal(avoidSlugs.some((slug) => machineOnly.includes(slug)), false);
  // Pull-ups (bodyweight) still cover the vertical pull once the lat pulldown is gone.
  assert.ok(avoidSlugs.includes("pull-up"));
  assert.notEqual(baseline.planId, avoidMachines.planId);
  assert.match(avoidMachines.rationale.join(" "), /Equipment you asked to avoid removed \d+ exercise choices?\./);
  assert.doesNotMatch(baseline.rationale.join(" "), /asked to avoid/);
});

test("avoiding all of a member's equipment fails closed instead of producing a one-lift workout day", () => {
  const result = resolveCuratedWorkoutPlan(intake({
    equipment: ["dumbbells"],
    avoidedEquipment: ["dumbbells"],
  }));
  assert.equal(result.status, "failed");
  if (result.status === "failed") {
    assert.equal(result.reason, "no-safe-plan");
    assert.match(result.message, /Too few safe exercises remain for/);
  }
});

test("a stated plan style selects a split only where a standard split exists for the day count", () => {
  const pushPullLegs = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 3,
    preferredStyle: "push-pull-legs",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(pushPullLegs.days.map((day) => day.name), ["Push", "Pull", "Legs"]);
  assert.match(pushPullLegs.rationale.join(" "), /push, pull, legs split matches your plan style/);

  const upperLower = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 2,
    preferredStyle: "upper-lower",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(upperLower.days.map((day) => day.name), ["Upper", "Lower"]);

  // No standard split for these combinations: the day count decides and the style is not claimed.
  const fullBodyAtThree = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 3,
    preferredStyle: "upper-lower",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(fullBodyAtThree.days.map((day) => day.name), ["Full Body A", "Full Body B", "Full Body C"]);
  assert.doesNotMatch(fullBodyAtThree.rationale.join(" "), /matches your plan style/);
  const pplAtFour = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 4,
    preferredStyle: "push-pull-legs",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(pplAtFour.days.map((day) => day.name), ["Upper A", "Lower A", "Upper B", "Lower B"]);
});

test("the plan id and rationale do not depend on the order equipment was selected", () => {
  const forward = generateCuratedWorkoutPlan(intake({ equipment: ["barbell", "dumbbells", "bodyweight"] }));
  const reversed = generateCuratedWorkoutPlan(intake({ equipment: ["bodyweight", "dumbbells", "barbell"] }));

  assert.deepEqual(forward, reversed);
});
