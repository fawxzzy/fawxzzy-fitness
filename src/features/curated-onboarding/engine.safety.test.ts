import assert from "node:assert/strict";
import test from "node:test";
import {
  CuratedIntakeIncompleteError,
  CuratedPlanBlockedError,
  evaluateCuratedSafetyGate,
  generateAdaptiveCuratedWorkoutPlan,
  generateCuratedWorkoutPlan,
  resolveCuratedWorkoutPlan,
} from "./engine.ts";
import { clearSafetyResponses } from "./test-fixtures.ts";
import type { CuratedIntakeResponses, CuratedOnboardingData } from "./types.ts";

function intake(
  overrides: Partial<CuratedOnboardingData> = {},
  responses: CuratedIntakeResponses = clearSafetyResponses(),
): CuratedOnboardingData {
  return {
    intakeResponses: responses,
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
  const symptomatic = intake({}, clearSafetyResponses({ warningSymptoms: ["dizziness", "chest-pain"] }));

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

test("only an explicit clear answer generates: exactly ['none'] with the acknowledgment and an age answer", () => {
  assert.equal(evaluateCuratedSafetyGate(intake()).status, "clear");
  assert.equal(resolveCuratedWorkoutPlan(intake()).status, "ready");
});

test("the gate fails closed on a missing, empty or wrong-typed warningSymptoms answer", () => {
  const cases: Array<[string, CuratedIntakeResponses]> = [
    ["omitted key", clearSafetyResponses({ warningSymptoms: undefined })],
    ["empty list", clearSafetyResponses({ warningSymptoms: [] })],
    ["string instead of list", clearSafetyResponses({ warningSymptoms: "chest-pain" })],
    ["string none instead of list", clearSafetyResponses({ warningSymptoms: "none" })],
    ["boolean", clearSafetyResponses({ warningSymptoms: true })],
    ["list with a non-string member", { ...clearSafetyResponses(), warningSymptoms: ["none", 1] as unknown as string[] }],
  ];

  for (const [label, responses] of cases) {
    const data = intake({}, responses);
    const gate = evaluateCuratedSafetyGate(data);
    assert.equal(gate.status, "unanswered", label);
    if (gate.status === "unanswered") assert.ok(gate.missing.includes("warningSymptoms"), label);
    assert.throws(() => generateCuratedWorkoutPlan(data), CuratedIntakeIncompleteError, label);
    const result = resolveCuratedWorkoutPlan(data);
    assert.equal(result.status, "failed", label);
    if (result.status === "failed") assert.equal(result.reason, "incomplete-intake", label);
  }
});

test("the gate fails closed without the safety acknowledgment or an age answer", () => {
  for (const [label, responses, missing] of [
    ["acknowledgment omitted", clearSafetyResponses({ safetyAcknowledgment: undefined }), "safetyAcknowledgment"],
    ["acknowledgment false", clearSafetyResponses({ safetyAcknowledgment: false }), "safetyAcknowledgment"],
    ["acknowledgment is a string", clearSafetyResponses({ safetyAcknowledgment: "true" }), "safetyAcknowledgment"],
    ["under18 omitted", clearSafetyResponses({ under18: undefined }), "under18"],
    ["under18 wrong type", clearSafetyResponses({ under18: true }), "under18"],
  ] as const) {
    const gate = evaluateCuratedSafetyGate(intake({}, responses));
    assert.equal(gate.status, "unanswered", label);
    if (gate.status === "unanswered") assert.ok(gate.missing.includes(missing), label);
    assert.equal(resolveCuratedWorkoutPlan(intake({}, responses)).status, "failed", label);
  }
});

test("'none' together with a symptom, and a free-text 'other' symptom, still require clearance", () => {
  assert.equal(
    evaluateCuratedSafetyGate(intake({}, clearSafetyResponses({ warningSymptoms: ["none", "palpitations"] }))).status,
    "clearance-required",
  );
  assert.equal(
    evaluateCuratedSafetyGate(intake({}, clearSafetyResponses({ warningSymptoms: ["other"] }))).status,
    "clearance-required",
  );
});

test("a member under 18 needs a parent or guardian's permission before a routine is generated", () => {
  const withoutPermission = intake({}, clearSafetyResponses({ under18: "yes" }));
  const declined = intake({}, clearSafetyResponses({ under18: "yes", guardianPermission: "no" }));
  const permitted = intake({}, clearSafetyResponses({ under18: "yes", guardianPermission: "yes" }));

  assert.equal(evaluateCuratedSafetyGate(withoutPermission).status, "guardian-permission-required");
  assert.equal(evaluateCuratedSafetyGate(declined).status, "guardian-permission-required");
  assert.equal(evaluateCuratedSafetyGate(permitted).status, "clear");

  const blocked = resolveCuratedWorkoutPlan(declined);
  assert.equal(blocked.status, "blocked");
  if (blocked.status === "blocked") {
    assert.equal(blocked.reason, "guardian-permission-required");
    assert.match(blocked.message, /parent or guardian/i);
    assert.doesNotMatch(blocked.message, /medical|diagnos|injur/i);
  }
  assert.equal(resolveCuratedWorkoutPlan(permitted).status, "ready");
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
    assert.match(noSafePlan.message, /No core exercise fits your equipment and limits/i);
  }
});

test("an unexpected internal error never leaks raw exception text to the member", () => {
  const hostile = intake();
  Object.defineProperty(hostile, "equipment", {
    get() {
      throw new TypeError("secret internal detail: relation \"routines\" does not exist");
    },
  });
  const result = resolveCuratedWorkoutPlan(hostile);

  assert.equal(result.status, "failed");
  if (result.status === "failed") {
    assert.doesNotMatch(result.message, /secret internal|relation|TypeError/);
    assert.match(result.message, /Edit your setup or build a routine manually/);
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
    assert.match(result.message, /Too few exercises remain for/);
  }
});

test("a stated plan style selects a split only where a standard split exists for the day count", () => {
  const pushPullLegs = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 3,
    preferredStyle: "push-pull-legs",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(pushPullLegs.days.map((day) => day.name), ["Push", "Pull", "Legs"]);
  assert.ok(pushPullLegs.rationale.includes("A push/pull/legs split matches your preferred style."));

  const upperLower = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 2,
    preferredStyle: "upper-lower",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(upperLower.days.map((day) => day.name), ["Upper", "Lower"]);
  assert.ok(upperLower.rationale.includes("An upper/lower split matches your preferred style."));

  // No standard split for these combinations: the day count decides and the style is not claimed.
  const fullBodyAtThree = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 3,
    preferredStyle: "upper-lower",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(fullBodyAtThree.days.map((day) => day.name), ["Full Body A", "Full Body B", "Full Body C"]);
  assert.doesNotMatch(fullBodyAtThree.rationale.join(" "), /matches your preferred style/);
  const pplAtFour = generateCuratedWorkoutPlan(intake({
    daysPerWeek: 4,
    preferredStyle: "push-pull-legs",
    equipment: ["full-gym"],
  }));
  assert.deepEqual(pplAtFour.days.map((day) => day.name), ["Upper A", "Lower A", "Upper B", "Lower B"]);
});

test("member-facing rationale uses routine language and human equipment names, never ids", () => {
  const plan = generateCuratedWorkoutPlan(intake({ equipment: ["full-gym", "barbell", "bands"] }));
  const text = plan.rationale.join(" | ");

  assert.match(text, /Exercises are chosen from resistance bands, a barbell and a full gym\./);
  assert.match(text, /Sets and reps are set for getting stronger at the intermediate level, and every exercise uses double progression\./);
  assert.doesNotMatch(text, /full-gym|training days|\bplan\b|constraints/);
  assert.match(text, /4 workout days sized for 45-minute sessions\./);
});

test("the plan id and rationale do not depend on the order equipment was selected", () => {
  const forward = generateCuratedWorkoutPlan(intake({ equipment: ["barbell", "dumbbells", "bodyweight"] }));
  const reversed = generateCuratedWorkoutPlan(intake({ equipment: ["bodyweight", "dumbbells", "barbell"] }));

  assert.deepEqual(forward, reversed);
});

test("the plan id identifies the reviewed output, so inputs that do not change the routine never change it", () => {
  const base = generateCuratedWorkoutPlan(intake({ equipment: ["barbell", "bodyweight"] }));
  // A like for an exercise the routine cannot contain, a dislike nobody could pick, different free text and
  // an unrelated response key do not change any exercise, so they must not change the id.
  const irrelevant = generateCuratedWorkoutPlan(intake({
    equipment: ["barbell", "bodyweight"],
    exerciseLikes: ["Zumba"],
    exerciseDislikes: ["Cable Fly"],
    limitations: "  ",
    cardioPreference: "focus",
  }, { ...clearSafetyResponses(), anythingElse: "hello" }));
  assert.equal(irrelevant.planId, base.planId);
  assert.deepEqual(irrelevant.days, base.days);

  // A change to the output changes the id.
  const different = generateCuratedWorkoutPlan(intake({ equipment: ["barbell", "bodyweight"], trainingGoal: "build-muscle" }));
  assert.notEqual(different.planId, base.planId);
});

test("shuffling every array and key order in the intake never changes the routine", () => {
  const responsesA: CuratedIntakeResponses = {
    ...clearSafetyResponses({ warningSymptoms: ["none"] }),
    exerciseEnjoy: "Dumbbell Bench Press, Plank",
  };
  const responsesB: CuratedIntakeResponses = Object.fromEntries(Object.entries(responsesA).reverse());
  const common = { trainingGoal: "build-muscle", experience: "advanced", daysPerWeek: 5, sessionLengthMinutes: 60 } as const;
  const a = generateAdaptiveCuratedWorkoutPlan(
    intake({
      ...common,
      equipment: ["full-gym", "dumbbells", "bands"],
      avoidedEquipment: ["machines", "barbell"],
      exerciseLikes: ["Dumbbell Bench Press", "Plank"],
      exerciseDislikes: ["Leg Press", "Walking Lunge"],
      targetAreas: ["Glutes", "Chest", "Back"],
    }, responsesA),
    {
      completionRate: 0.8,
      missedWorkoutCount: 1,
      failedExerciseSlugs: ["barbell-row", "pull-up"],
      fatiguedExerciseSlugs: ["back-squat", "lat-pulldown"],
    },
  );
  const b = generateAdaptiveCuratedWorkoutPlan(
    intake({
      ...common,
      equipment: ["bands", "dumbbells", "full-gym"],
      avoidedEquipment: ["barbell", "machines"],
      exerciseLikes: ["Plank", "Dumbbell Bench Press"],
      exerciseDislikes: ["Walking Lunge", "Leg Press"],
      targetAreas: ["Back", "Chest", "Glutes"],
    }, responsesB),
    {
      completionRate: 0.8,
      missedWorkoutCount: 1,
      failedExerciseSlugs: ["pull-up", "barbell-row"],
      fatiguedExerciseSlugs: ["lat-pulldown", "back-squat"],
    },
  );

  assert.deepEqual(a, b);
});
