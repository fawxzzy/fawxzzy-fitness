import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createCuratedOnboardingDraft } from "../fixtures.ts";
import { CURATED_QUESTION_IDS } from "../questionnaire.ts";
import {
  canonicalizeJson,
  digestCanonicalJson,
  sha256Hex,
} from "./canonical.ts";
import {
  CANONICAL_CONSTRAINT_CLASS_PATHS,
  CURATED_RESPONSE_PATH_BY_QUESTION_ID,
  NORMALIZED_PLANNING_INTAKE_V1_SCHEMA,
  type NormalizedPlanningIntakeV1,
  validateNormalizedPlanningIntakeV1,
} from "./contract.ts";
import {
  NORMALIZED_PLANNING_FIXTURE_EXPECTATIONS,
  NORMALIZED_PLANNING_FIXTURE_IDS,
  NORMALIZED_PLANNING_FIXTURES,
  createNormalizedPlanningFixtureInput,
} from "./fixtures.ts";
import {
  canonicalizeNormalizedPlanningIntake,
  normalizeCuratedPlanningIntake,
} from "./normalize.ts";
import {
  buildPlanningGenerationProjection,
  digestPlanningGenerationProjection,
} from "./projection.ts";

const GOLDEN_GENERATION_PROJECTION_DIGESTS = {
  "beginner-home-3day-general-strength": "5c273b75bf22f032fb2fbb33e73b0b46985bc944ff31acedff894b000017317e",
  "beginner-planet-fitness-4day-muscle-gain": "b45da9af4f5759d0f209f9fb0356c27de3674151ca3817328fcdd9d24ba875f7",
  "intermediate-freeweights-5day-strength": "87e957fc25e9810c8c267fa653bbe23ad40a8880d02a012af72cd78c7cf14633",
  "time-limited-3day-30min": "6eb5b56ae731a27346d94f8b46b64900576c2ecbcc2bd2576e1b472fafd435e1",
  "bodyweight-travel-4day-general-fitness": "d6808626ee11f7a3c029a764546487626ce2f92f5a44f2dbfcb4df1fc5c107e7",
  "cardio-priority-4day-hybrid": "cf32cb5bd424794d6cd68d3c3b7f57245d6a479107d4d9efcb60eebfe1f0e762",
  "lower-emphasis-4day-secondary-upper": "f8fa06308fd79087e3acdeb0397efe8d9563898614b83ab482325388f5cf2206",
  "no-overhead-3day-substitution": "feccf394effd207a834f6e96824c2222651dbfffb9d50a9c8fc9ecbad68c7e7f",
  "ambiguous-warning-blocked": "0819b94425136c8f2261874610714e391110494a58367bb21445ef16edd451a6",
  "pullup-priority-no-pull-equipment": "67a31ebb78ccdff59afee3759682758c8d8dbbd56b9bf6c3d7131e2dc47bd453",
} as const;

function recomputePlanningDigest(
  input: NormalizedPlanningIntakeV1,
): NormalizedPlanningIntakeV1 {
  const clone = structuredClone(input);
  const {
    generationProjectionDigest: _generationProjectionDigest,
    ...withoutDigest
  } = clone;
  return {
    ...withoutDigest,
    generationProjectionDigest: digestPlanningGenerationProjection(withoutDigest),
  };
}

test("canonical JSON and portable SHA-256 are deterministic across property order", () => {
  const left = { z: 1, nested: { b: true, a: "value" }, list: [3, 2, 1] };
  const right = { list: [3, 2, 1], nested: { a: "value", b: true }, z: 1 };
  const unicode = "Fawxzzy Fitness deterministic planning";

  assert.equal(canonicalizeJson(left), canonicalizeJson(right));
  assert.equal(digestCanonicalJson(left), digestCanonicalJson(right));
  assert.equal(
    sha256Hex(unicode),
    createHash("sha256").update(unicode, "utf8").digest("hex"),
  );
  assert.throws(() => canonicalizeJson({ invalid: undefined }), /Undefined is not canonical JSON/);
});

test("all ten golden normalized fixtures satisfy the contract and pinned projections", () => {
  assert.equal(NORMALIZED_PLANNING_FIXTURE_IDS.length, 10);

  for (const fixtureId of NORMALIZED_PLANNING_FIXTURE_IDS) {
    const fixture = NORMALIZED_PLANNING_FIXTURES[fixtureId];
    const expected = NORMALIZED_PLANNING_FIXTURE_EXPECTATIONS[fixtureId];
    const repeated = normalizeCuratedPlanningIntake(
      createNormalizedPlanningFixtureInput(fixtureId),
    );

    assert.deepEqual(validateNormalizedPlanningIntakeV1(fixture), [], fixtureId);
    assert.equal(fixture.schedule.requestedDaysPerWeek, expected.daysPerWeek, fixtureId);
    assert.deepEqual(fixture.schedule.weekdays, expected.weekdays, fixtureId);
    assert.equal(fixture.goals.primary, expected.primaryGoal, fixtureId);
    assert.equal(fixture.safety.status === "blocked", expected.blocked, fixtureId);
    assert.equal(
      fixture.generationProjectionDigest,
      GOLDEN_GENERATION_PROJECTION_DIGESTS[fixtureId],
      fixtureId,
    );
    assert.equal(
      canonicalizeNormalizedPlanningIntake(fixture),
      canonicalizeNormalizedPlanningIntake(repeated),
      fixtureId,
    );
  }
});

test("contract schema rejects unknown root state and unsupported versions", () => {
  const fixture = NORMALIZED_PLANNING_FIXTURES["beginner-home-3day-general-strength"];
  const unknownRootState = { ...fixture, unexpected: true };
  const unknownNestedState = {
    ...fixture,
    schedule: { ...fixture.schedule, unexpected: true },
  };
  const unsupportedVersion = { ...fixture, contractVersion: "fitness.planning-intake.v2" };

  assert.equal(NORMALIZED_PLANNING_INTAKE_V1_SCHEMA.additionalProperties, false);
  assert.match(validateNormalizedPlanningIntakeV1(unknownRootState).join(" "), /unknown property unexpected/);
  assert.match(
    validateNormalizedPlanningIntakeV1(unknownNestedState).join(" "),
    /\$\.schedule contains unknown property unexpected/,
  );
  assert.match(validateNormalizedPlanningIntakeV1(unsupportedVersion).join(" "), /unsupported/);
});

test("runtime validation rejects forged and internally contradictory contracts", () => {
  const baseline = NORMALIZED_PLANNING_FIXTURES["beginner-home-3day-general-strength"];
  const blocked = NORMALIZED_PLANNING_FIXTURES["ambiguous-warning-blocked"];
  const cases: Array<{ expected: RegExp; value: unknown }> = [
    {
      expected: /does not match the semantic projection/,
      value: { ...baseline, generationProjectionDigest: "0".repeat(64) },
    },
    {
      expected: /secondary\[0\]\.value must be a non-empty string/,
      value: {
        ...baseline,
        goals: {
          ...baseline.goals,
          secondary: [{ value: 123, rank: 0, ranking: "bogus" }],
        },
      },
    },
    {
      expected: /status must be blocked/,
      value: { ...blocked, safety: { ...blocked.safety, status: "clear" } },
    },
    {
      expected: /fixed weekday count must equal requestedDaysPerWeek/,
      value: {
        ...baseline,
        schedule: {
          ...baseline.schedule,
          weekdays: baseline.schedule.weekdays.slice(0, 2),
        },
      },
    },
    {
      expected: /target must not exceed hardMaximum/,
      value: {
        ...baseline,
        schedule: {
          ...baseline.schedule,
          sessionMinutes: { target: 60, hardMaximum: 30 },
        },
      },
    },
    {
      expected: /normalizationIssues\[0\] is missing required property severity/,
      value: {
        ...baseline,
        normalizationIssues: [{ code: "RECENT_CONTINUITY_UNKNOWN" }],
      },
    },
    {
      expected: /provenance.*responseDigest must be a SHA-256 hex digest/,
      value: {
        ...baseline,
        provenance: {
          ...baseline.provenance,
          "/schedule/requestedDaysPerWeek": [{
            questionId: "trainingDaysPerWeek",
            responseDigest: "forged",
            normalizationRule: "schedule.days.v1",
          }],
        },
      },
    },
  ];

  for (const entry of cases) {
    assert.match(validateNormalizedPlanningIntakeV1(entry.value).join(" "), entry.expected);
  }
});

test("digest-consistent semantic contradictions fail closed", () => {
  const baseline = NORMALIZED_PLANNING_FIXTURES["beginner-home-3day-general-strength"];

  const downgradedSafetyIssue = structuredClone(baseline);
  downgradedSafetyIssue.normalizationIssues = [{
    code: "SAFETY_CLEARANCE_REQUIRED",
    severity: "informational",
    fieldPath: "/safety/warningFlags",
    sourceQuestionIds: ["warningSymptoms"],
    messageArguments: {},
  }];
  downgradedSafetyIssue.constraintClasses.blockingIssueCodes = [];

  const concealedWarning = structuredClone(baseline);
  concealedWarning.safety.status = "restricted";
  concealedWarning.safety.warningFlags = ["chest-pain"];
  concealedWarning.safety.movementRestrictions = [{
    code: "NO_OVERHEAD_LOADING",
    sourceText: "no overhead loading",
  }];

  const concealedProfessionalDirection = structuredClone(baseline);
  concealedProfessionalDirection.safety.professionalDirection = {
    present: true,
    restrictionCodes: [],
    userReportedClearanceStatus: "not_cleared",
  };

  const unresolvedProfessionalDirection = structuredClone(baseline);
  unresolvedProfessionalDirection.safety.professionalDirection = {
    present: true,
    restrictionCodes: [],
    userReportedClearanceStatus: "unknown",
  };

  const misalignedProfessionalRestrictions = structuredClone(
    NORMALIZED_PLANNING_FIXTURES["no-overhead-3day-substitution"],
  );
  misalignedProfessionalRestrictions.safety.professionalDirection.restrictionCodes = [
    "NO_HIGH_IMPACT",
  ];

  const contradictoryCountOnlySchedule = structuredClone(baseline);
  contradictoryCountOnlySchedule.schedule.dayConstraint = "count_only";

  const missingHardMaximum = structuredClone(baseline);
  missingHardMaximum.schedule.sessionMinutes = {
    target: 30,
    hardMaximum: null,
  };

  const knownCountInUnknownSchedule = structuredClone(baseline);
  knownCountInUnknownSchedule.schedule = {
    ...knownCountInUnknownSchedule.schedule,
    requestedDaysPerWeek: 3,
    weekdays: [],
    dayConstraint: "unknown",
    flexibility: "unknown",
  };

  const forgedResponseIssuePath = structuredClone(baseline);
  forgedResponseIssuePath.normalizationIssues = [
    ...forgedResponseIssuePath.normalizationIssues,
    {
      code: "MISSING_REQUIRED_VALUE",
      severity: "blocking",
      fieldPath: "/totally/unknown",
      sourceQuestionIds: ["forged"],
      messageArguments: {},
    },
  ];
  forgedResponseIssuePath.constraintClasses.blockingIssueCodes = [
    "MISSING_REQUIRED_VALUE",
  ];

  const cases: Array<{ expected: RegExp; value: NormalizedPlanningIntakeV1 }> = [
    {
      expected: /severity must be blocking for SAFETY_CLEARANCE_REQUIRED/,
      value: recomputePlanningDigest(downgradedSafetyIssue),
    },
    {
      expected: /warningFlags require a canonical blocking clearance issue/,
      value: recomputePlanningDigest(concealedWarning),
    },
    {
      expected: /not_cleared requires a blocking clearance issue/,
      value: recomputePlanningDigest(concealedProfessionalDirection),
    },
    {
      expected: /unresolved direction requires a blocking safety issue/,
      value: recomputePlanningDigest(unresolvedProfessionalDirection),
    },
    {
      expected: /restrictionCodes must exist in movementRestrictions/,
      value: recomputePlanningDigest(misalignedProfessionalRestrictions),
    },
    {
      expected: /count_only requires a day count, no weekdays, and any-day flexibility/,
      value: recomputePlanningDigest(contradictoryCountOnlySchedule),
    },
    {
      expected: /target and hardMaximum must be present or absent together/,
      value: recomputePlanningDigest(missingHardMaximum),
    },
    {
      expected: /unknown dayConstraint requires a null day count/,
      value: recomputePlanningDigest(knownCountInUnknownSchedule),
    },
    {
      expected: /fieldPath must be one of the governed response paths/,
      value: recomputePlanningDigest(forgedResponseIssuePath),
    },
  ];

  for (const entry of cases) {
    assert.match(validateNormalizedPlanningIntakeV1(entry.value).join(" "), entry.expected);
  }
});

test("every questionnaire question has one governed response issue path", () => {
  assert.deepEqual(
    Object.keys(CURATED_RESPONSE_PATH_BY_QUESTION_ID).sort(),
    [...CURATED_QUESTION_IDS].sort(),
  );
  assert.equal(
    new Set(Object.values(CURATED_RESPONSE_PATH_BY_QUESTION_ID)).size,
    CURATED_QUESTION_IDS.length,
  );
});

test("constraint classifications are canonical, disjoint, and caller-immutable", () => {
  const baseline = NORMALIZED_PLANNING_FIXTURES["beginner-home-3day-general-strength"];
  const restricted = NORMALIZED_PLANNING_FIXTURES["no-overhead-3day-substitution"];
  const pathClassKeys = Object.keys(
    CANONICAL_CONSTRAINT_CLASS_PATHS,
  ) as Array<keyof typeof CANONICAL_CONSTRAINT_CLASS_PATHS>;
  const schemaConstraintPathPolicies = NORMALIZED_PLANNING_INTAKE_V1_SCHEMA
    .properties.constraintClasses.properties as unknown as Record<
      keyof typeof CANONICAL_CONSTRAINT_CLASS_PATHS,
      { const: readonly string[] }
    >;

  for (const fixture of Object.values(NORMALIZED_PLANNING_FIXTURES)) {
    for (const key of pathClassKeys) {
      assert.deepEqual(
        fixture.constraintClasses[key],
        CANONICAL_CONSTRAINT_CLASS_PATHS[key],
      );
      assert.deepEqual(
        schemaConstraintPathPolicies[key].const,
        CANONICAL_CONSTRAINT_CLASS_PATHS[key],
      );
    }
  }

  const allCanonicalPaths = pathClassKeys.flatMap(
    (key) => [...CANONICAL_CONSTRAINT_CLASS_PATHS[key]],
  );
  assert.equal(new Set(allCanonicalPaths).size, allCanonicalPaths.length);

  function moveHardConstraintToOptimization(
    input: NormalizedPlanningIntakeV1,
    path: NormalizedPlanningIntakeV1["constraintClasses"]["hardConstraintPaths"][number],
  ) {
    const clone = structuredClone(input);
    clone.constraintClasses.hardConstraintPaths = (
      clone.constraintClasses.hardConstraintPaths.filter((entry) => entry !== path)
    );
    clone.constraintClasses.optimizationPaths.push(path);
    return clone;
  }

  const demotedSafety = moveHardConstraintToOptimization(
    restricted,
    "/safety/movementRestrictions",
  );
  const demotedSchedule = moveHardConstraintToOptimization(
    baseline,
    "/schedule/dayConstraint",
  );
  const demotedEquipment = moveHardConstraintToOptimization(
    baseline,
    "/environment/equipmentAvailable",
  );
  const duplicatedSafety = structuredClone(restricted);
  duplicatedSafety.constraintClasses.optimizationPaths.push(
    "/safety/movementRestrictions",
  );

  for (const [original, mutated] of [
    [restricted, demotedSafety],
    [baseline, demotedSchedule],
    [baseline, demotedEquipment],
  ] as const) {
    assert.equal(mutated.generationProjectionDigest, original.generationProjectionDigest);
    assert.match(
      validateNormalizedPlanningIntakeV1(mutated).join(" "),
      /must equal the canonical (hardConstraintPaths|optimizationPaths) set in exact order/,
    );
  }
  assert.match(
    validateNormalizedPlanningIntakeV1(duplicatedSafety).join(" "),
    /must be disjoint/,
  );
});

test("semantic issue projection excludes questionnaire provenance identifiers", () => {
  const blocked = NORMALIZED_PLANNING_FIXTURES["ambiguous-warning-blocked"];
  const altered = structuredClone(blocked);
  for (const issue of altered.normalizationIssues) {
    issue.sourceQuestionIds = ["renamed-source-question"];
  }
  for (const issue of altered.safety.unresolvedItems) {
    issue.sourceQuestionIds = ["renamed-source-question"];
  }
  const {
    generationProjectionDigest: _blockedDigest,
    ...blockedWithoutDigest
  } = blocked;
  const {
    generationProjectionDigest: _alteredDigest,
    ...alteredWithoutDigest
  } = altered;
  const projection = buildPlanningGenerationProjection(blockedWithoutDigest);

  assert.equal(canonicalizeJson(projection).includes("sourceQuestionIds"), false);
  assert.equal(
    digestPlanningGenerationProjection(alteredWithoutDigest),
    digestPlanningGenerationProjection(blockedWithoutDigest),
  );
});

test("unordered equipment and exclusion permutations preserve canonical output and projection digest", () => {
  const leftInput = createNormalizedPlanningFixtureInput(
    "beginner-planet-fitness-4day-muscle-gain",
  );
  const rightInput = createNormalizedPlanningFixtureInput(
    "beginner-planet-fitness-4day-muscle-gain",
  );
  const equipment = rightInput.intakeResponses.availableEquipment;
  assert.ok(Array.isArray(equipment));
  rightInput.intakeResponses.availableEquipment = [...equipment].reverse();

  const left = normalizeCuratedPlanningIntake(leftInput);
  const right = normalizeCuratedPlanningIntake(rightInput);

  assert.deepEqual(left.environment.equipmentAvailable, right.environment.equipmentAvailable);
  assert.equal(left.source.rawResponseDigest, right.source.rawResponseDigest);
  assert.equal(left.generationProjectionDigest, right.generationProjectionDigest);
  assert.equal(
    canonicalizeNormalizedPlanningIntake(left),
    canonicalizeNormalizedPlanningIntake(right),
  );

  const leftExclusionInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  const rightExclusionInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  leftExclusionInput.intakeResponses.exercisesCannotDo = "Burpee, sit-up";
  rightExclusionInput.intakeResponses.exercisesCannotDo = "sit-up; BURPEE";

  const leftExclusion = normalizeCuratedPlanningIntake(leftExclusionInput);
  const rightExclusion = normalizeCuratedPlanningIntake(rightExclusionInput);

  assert.deepEqual(
    leftExclusion.safety.excludedExerciseNames,
    ["burpee", "sit-up"],
  );
  assert.equal(
    canonicalizeNormalizedPlanningIntake(leftExclusion),
    canonicalizeNormalizedPlanningIntake(rightExclusion),
  );
});

test("ranked-goal and exact-weekday changes alter the generation projection", () => {
  const baselineInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  const rankedGoalInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  const weekdayInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  rankedGoalInput.intakeResponses.topThreeGoals = "Build consistency\nGet stronger\nGeneral fitness";
  weekdayInput.intakeResponses.preferredTrainingDays = ["tue", "thu", "sat"];

  const baseline = normalizeCuratedPlanningIntake(baselineInput);
  const rankedGoal = normalizeCuratedPlanningIntake(rankedGoalInput);
  const weekday = normalizeCuratedPlanningIntake(weekdayInput);

  assert.notEqual(rankedGoal.generationProjectionDigest, baseline.generationProjectionDigest);
  assert.notEqual(weekday.generationProjectionDigest, baseline.generationProjectionDigest);
  assert.deepEqual(weekday.schedule.weekdays, ["tuesday", "thursday", "saturday"]);
});

test("flexible schedule answers normalize to a closed count-only state", () => {
  const input = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  input.intakeResponses.preferredTrainingDays = ["flexible"];

  const normalized = normalizeCuratedPlanningIntake(input);

  assert.equal(normalized.schedule.dayConstraint, "count_only");
  assert.equal(normalized.schedule.flexibility, "any_available_day");
  assert.deepEqual(normalized.schedule.weekdays, []);
  assert.deepEqual(validateNormalizedPlanningIntakeV1(normalized), []);
});

test("contradictory fixed-day answers normalize to a blocked canonical unknown state", () => {
  const input = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  input.intakeResponses.trainingDaysPerWeek = "4";

  const normalized = normalizeCuratedPlanningIntake(input);

  assert.equal(normalized.schedule.requestedDaysPerWeek, null);
  assert.equal(normalized.schedule.dayConstraint, "unknown");
  assert.equal(normalized.schedule.flexibility, "unknown");
  assert.deepEqual(normalized.schedule.weekdays, []);
  assert.ok(
    normalized.constraintClasses.blockingIssueCodes.includes("DAY_COUNT_MISMATCH"),
  );
  assert.deepEqual(validateNormalizedPlanningIntakeV1(normalized), []);
});

test("hidden cleared answers do not survive normalization", () => {
  const baselineInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  const staleInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  staleInput.intakeResponses.guardianPermission = "no";
  staleInput.intakeResponses.painDetails = "Old overhead limitation";
  staleInput.intakeResponses.restrictedMovements = "Old axial loading restriction";

  const baseline = normalizeCuratedPlanningIntake(baselineInput);
  const stale = normalizeCuratedPlanningIntake(staleInput);

  assert.deepEqual(stale.safety.movementRestrictions, []);
  assert.equal(stale.source.rawResponseDigest, baseline.source.rawResponseDigest);
  assert.equal(stale.generationProjectionDigest, baseline.generationProjectionDigest);
});

test("malformed Other values produce deterministic blocking issues", () => {
  const input = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  input.intakeResponses.mainGoals = ["other"];
  delete input.intakeResponses.mainGoalsOther;

  const first = normalizeCuratedPlanningIntake(input);
  const second = normalizeCuratedPlanningIntake(input);
  const codes = first.normalizationIssues.map((issue) => issue.code);

  assert.ok(codes.includes("MISSING_REQUIRED_VALUE"));
  assert.ok(codes.includes("UNRESOLVED_OTHER_VALUE"));
  assert.equal(
    canonicalizeNormalizedPlanningIntake(first),
    canonicalizeNormalizedPlanningIntake(second),
  );
});

test("unknown options and wrong-typed safety answers fail closed with stable codes", () => {
  const invalidOptionInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  const invalidSafetyTypeInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  invalidOptionInput.intakeResponses.planStyle = "surprise-me";
  invalidSafetyTypeInput.intakeResponses.warningSymptoms = "none";

  const invalidOption = normalizeCuratedPlanningIntake(invalidOptionInput);
  const invalidSafetyType = normalizeCuratedPlanningIntake(invalidSafetyTypeInput);

  assert.ok(invalidOption.constraintClasses.blockingIssueCodes.includes("INVALID_OPTION"));
  assert.ok(
    invalidSafetyType.constraintClasses.blockingIssueCodes.includes(
      "AMBIGUOUS_SAFETY_RESPONSE",
    ),
  );
  assert.equal(invalidSafetyType.safety.status, "blocked");
});

test("ambiguous safety information blocks while explicit restrictions remain scoped", () => {
  const blocked = NORMALIZED_PLANNING_FIXTURES["ambiguous-warning-blocked"];
  const restricted = NORMALIZED_PLANNING_FIXTURES["no-overhead-3day-substitution"];

  assert.equal(blocked.safety.status, "blocked");
  assert.ok(blocked.constraintClasses.blockingIssueCodes.includes("AMBIGUOUS_SAFETY_RESPONSE"));
  assert.ok(blocked.constraintClasses.blockingIssueCodes.includes("SAFETY_CLEARANCE_REQUIRED"));
  assert.equal(restricted.safety.status, "restricted");
  assert.deepEqual(restricted.safety.professionalDirection.restrictionCodes, ["NO_OVERHEAD_LOADING"]);
  assert.ok(restricted.safety.excludedExerciseNames.includes("overhead press"));
});

test("delivery and contact context do not alter exercise-selection projection", () => {
  const baselineInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  const contextInput = createNormalizedPlanningFixtureInput(
    "beginner-home-3day-general-strength",
  );
  contextInput.intakeResponses.email = "another@example.com";
  contextInput.intakeResponses.name = "Another Fixture";
  contextInput.intakeResponses.planDetail = "detailed";
  contextInput.intakeResponses.deliveryMethod = "email";
  contextInput.intakeResponses.followUpConsent = "no";
  contextInput.intakeResponses.trainingTime = "night";
  contextInput.intakeResponses.mainLiftNumbers = "Bench 315 lb";

  const baseline = normalizeCuratedPlanningIntake(baselineInput);
  const context = normalizeCuratedPlanningIntake(contextInput);

  assert.notEqual(context.source.rawResponseDigest, baseline.source.rawResponseDigest);
  assert.notDeepEqual(context.planContext.delivery, baseline.planContext.delivery);
  assert.notEqual(
    context.trainingBackground.knownPerformanceContext,
    baseline.trainingBackground.knownPerformanceContext,
  );
  assert.equal(context.generationProjectionDigest, baseline.generationProjectionDigest);
});

test("normalization does not trust legacy derived fields or introduce a starting load", () => {
  const input = createNormalizedPlanningFixtureInput(
    "beginner-planet-fitness-4day-muscle-gain",
  );
  Object.assign(input, {
    trainingGoal: "get-stronger",
    experience: "advanced",
    daysPerWeek: 7,
    sessionLengthMinutes: 90,
    equipment: ["full-gym", "barbell"],
  });

  const normalized = normalizeCuratedPlanningIntake(input);
  const canonical = canonicalizeNormalizedPlanningIntake(normalized);

  assert.equal(normalized.goals.primary, "build_muscle");
  assert.equal(normalized.trainingBackground.experience, "beginner");
  assert.equal(normalized.schedule.requestedDaysPerWeek, 4);
  assert.equal(normalized.environment.equipmentAvailable.includes("barbells"), false);
  assert.equal(canonical.includes("startingLoad"), false);
});

test("an empty legacy onboarding object fails closed deterministically", () => {
  const empty = createCuratedOnboardingDraft().data;
  const first = normalizeCuratedPlanningIntake(empty);
  const second = normalizeCuratedPlanningIntake(empty);

  assert.ok(first.constraintClasses.blockingIssueCodes.includes("MISSING_REQUIRED_VALUE"));
  assert.equal(first.safety.status, "blocked");
  assert.equal(first.generationProjectionDigest, second.generationProjectionDigest);
  assert.deepEqual(validateNormalizedPlanningIntakeV1(first), []);
});
