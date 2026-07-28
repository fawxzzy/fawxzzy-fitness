import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  digestPlanningGenerationProjection,
} from "../projection.ts";
import {
  NORMALIZED_PLANNING_FIXTURES,
  type NormalizedPlanningFixtureId,
} from "../fixtures.ts";
import {
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import { PLANNER_EXERCISE_CATALOG_V1 } from "../catalog/catalog.ts";
import {
  EQUIPMENT_IDS,
  GOAL_CODES,
  type EquipmentId,
  type ExerciseCatalogBundleV1,
} from "../catalog/contract.ts";
import {
  digestExerciseCatalog,
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  compilePlanningCoverageV1,
  validateCoverageCompilationAgainstInputsV1,
} from "./compile.ts";
import {
  CARDIO_COVERAGE_POLICY,
  COVERAGE_COMPILATION_V1_SCHEMA,
  COVERAGE_ISSUE_CODES,
  COVERAGE_ISSUE_POLICY,
  MOVEMENT_SKILL_COVERAGE_POLICY,
  PRIMARY_GOAL_COVERAGE_POLICY,
  SECONDARY_GOAL_COVERAGE_POLICY,
  TARGET_AREA_COVERAGE_POLICY,
  digestCoverageCompilation,
  validateCoverageCompilationV1,
  type CoverageCompilationV1,
} from "./contract.ts";

const EXPECTED_FIXTURE_RESULTS: Record<
  NormalizedPlanningFixtureId,
  { status: CoverageCompilationV1["status"]; digest: string }
> = {
  "beginner-home-3day-general-strength": {
    status: "ready",
    digest: "bf7ccfc054cee337bd9a2a59f7ccfe686a45a7d5acd49b8cc8127e5a4a3661e6",
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    status: "ready",
    digest: "b2d3c2ee9caf6620f8a40211e7f841552b6e73567074c5004a5beaaba0777a2e",
  },
  "intermediate-freeweights-5day-strength": {
    status: "ready",
    digest: "2a00a9720dacd0ad919d50e4ac53d4dc90cdcc91d41b334f984c91f0ad7e5462",
  },
  "time-limited-3day-30min": {
    status: "ready",
    digest: "1ee4f9e8599f697613133a32a0dbac1b7ac8a549ad87830191bbff6b4c78f033",
  },
  "bodyweight-travel-4day-general-fitness": {
    status: "infeasible",
    digest: "05d00fab656135a7ddf8aaa205f4b7d3fc5c8121cadad87e8469667039ea4cf4",
  },
  "cardio-priority-4day-hybrid": {
    status: "invalid_input",
    digest: "e1716f4224eefc1e5ad2e1393613feff55394cd6afaf20a48af44335f08c9658",
  },
  "lower-emphasis-4day-secondary-upper": {
    status: "ready",
    digest: "d02af5a97f4dfa934da9c5a9b272ceab59e27b1b744104ee8e812954af3d279f",
  },
  "no-overhead-3day-substitution": {
    status: "needs_clarification",
    digest: "5a189331f7b826d60189773d53e7007269c793919b8c094d904323c2857286a2",
  },
  "ambiguous-warning-blocked": {
    status: "blocked",
    digest: "ca608adeca800659b9279ca18848997e811ef6fe8b2895c8617d6c9b9caf16cd",
  },
  "pullup-priority-no-pull-equipment": {
    status: "infeasible",
    digest: "94736f49651e0a654a6a65beace8f8e25e46ebf85e6f989ef6a6236f2de8413c",
  },
};

function clonePlanning(
  fixtureId: NormalizedPlanningFixtureId = "beginner-home-3day-general-strength",
) {
  return structuredClone(NORMALIZED_PLANNING_FIXTURES[fixtureId]);
}

function resignPlanning(
  mutate: (planning: NormalizedPlanningIntakeV1) => void,
  fixtureId: NormalizedPlanningFixtureId = "beginner-home-3day-general-strength",
) {
  const planning = clonePlanning(fixtureId);
  mutate(planning);
  planning.generationProjectionDigest = digestPlanningGenerationProjection(planning);
  assert.deepEqual(validateNormalizedPlanningIntakeV1(planning), []);
  return planning;
}

function cloneCatalog() {
  return structuredClone(PLANNER_EXERCISE_CATALOG_V1);
}

function resignCatalog(mutate: (catalog: ExerciseCatalogBundleV1) => void) {
  const catalog = cloneCatalog();
  mutate(catalog);
  catalog.catalogDigest = digestExerciseCatalog(catalog);
  assert.deepEqual(validateExerciseCatalogBundleV1(catalog), []);
  return catalog;
}

function issueCodes(result: CoverageCompilationV1) {
  return result.issues.map((entry) => entry.code);
}

function requirement(result: CoverageCompilationV1, id: string) {
  const found = result.requirements.find((entry) => entry.id === id);
  assert.ok(found, `Expected requirement ${id}`);
  return found;
}

function recursivelyFrozen(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  return Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen);
}

test("coverage schema and executable policy registries are closed and frozen", () => {
  assert.equal(COVERAGE_COMPILATION_V1_SCHEMA.additionalProperties, false);
  assert.deepEqual(
    Object.keys(PRIMARY_GOAL_COVERAGE_POLICY).sort(),
    [...GOAL_CODES].sort(),
  );
  assert.deepEqual(
    Object.keys(MOVEMENT_SKILL_COVERAGE_POLICY).sort(),
    [
      "arms",
      "bench-press",
      "cardio",
      "core",
      "deadlift-rdl",
      "pull-ups",
      "push-ups",
      "rows",
      "shoulder-press",
      "squat",
    ],
  );
  assert.deepEqual(
    Object.keys(COVERAGE_ISSUE_POLICY).sort(),
    [...COVERAGE_ISSUE_CODES].sort(),
  );
  for (const policy of [
    PRIMARY_GOAL_COVERAGE_POLICY,
    SECONDARY_GOAL_COVERAGE_POLICY,
    TARGET_AREA_COVERAGE_POLICY,
    MOVEMENT_SKILL_COVERAGE_POLICY,
    CARDIO_COVERAGE_POLICY,
    COVERAGE_ISSUE_POLICY,
  ]) {
    assert.equal(recursivelyFrozen(policy), true);
  }
});

test("all ten normalized fixtures produce pinned, runtime-valid terminal contracts", () => {
  for (const [fixtureId, planning] of Object.entries(NORMALIZED_PLANNING_FIXTURES)) {
    const expected = EXPECTED_FIXTURE_RESULTS[
      fixtureId as NormalizedPlanningFixtureId
    ];
    const result = compilePlanningCoverageV1(
      planning,
      PLANNER_EXERCISE_CATALOG_V1,
    );
    assert.equal(result.status, expected.status, fixtureId);
    assert.equal(result.coverageDigest, expected.digest, fixtureId);
    assert.deepEqual(validateCoverageCompilationV1(result), [], fixtureId);
    assert.deepEqual(
      validateCoverageCompilationAgainstInputsV1(
        result,
        planning,
        PLANNER_EXERCISE_CATALOG_V1,
      ),
      [],
      fixtureId,
    );
  }
});

test("ready results preserve exact schedule, duration, and hard constraints", () => {
  const planning = clonePlanning();
  const result = compilePlanningCoverageV1(
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.equal(result.status, "ready");
  assert.deepEqual(result.schedule, {
    requestedDaysPerWeek: 3,
    weekdays: ["monday", "wednesday", "friday"],
    dayConstraint: "fixed",
    flexibility: "none",
    sessionMinutes: { target: 50, hardMaximum: 50 },
  });
  assert.deepEqual(result.hardConstraints, {
    availableEquipment: ["bench", "bodyweight", "dumbbells", "resistance-bands"],
    avoidedEquipment: [],
    maximumDumbbellLoadKg: 22.68,
    restrictionCodes: [],
    excludedExerciseIds: [],
    uncomfortableExerciseIds: [],
  });
  assert.ok(result.requirements.every(
    (entry) => entry.compatibleExerciseIds.length > 0,
  ));
});

test("invalid planning or catalog digests fail before compilation", () => {
  const planning = clonePlanning();
  planning.generationProjectionDigest = "0".repeat(64);
  const catalog = cloneCatalog();
  catalog.catalogDigest = "0".repeat(64);
  const result = compilePlanningCoverageV1(planning, catalog);
  assert.equal(result.status, "invalid_input");
  assert.deepEqual(issueCodes(result), ["CATALOG_INVALID", "INTAKE_INVALID"]);
  assert.equal(result.schedule, null);
  assert.equal(result.hardConstraints, null);
  assert.deepEqual(result.requirements, []);
  assert.deepEqual(validateCoverageCompilationV1(result), []);
});

test("blocking and ambiguous safety never emit executable coverage", () => {
  const planning = clonePlanning("ambiguous-warning-blocked");
  const result = compilePlanningCoverageV1(
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.equal(result.status, "blocked");
  assert.deepEqual(issueCodes(result), ["PLANNING_BLOCKED", "SAFETY_BLOCKED"]);
  assert.equal(result.schedule, null);
  assert.deepEqual(result.requirements, []);
  assert.deepEqual(validateCoverageCompilationV1(result), []);
});

test("missing execution-critical truth returns stable clarification issues", () => {
  const cases: Array<{
    code: string;
    planning: NormalizedPlanningIntakeV1;
  }> = [
    {
      code: "SCHEDULE_REQUIRED",
      planning: resignPlanning((value) => {
        value.schedule.requestedDaysPerWeek = null;
        value.schedule.weekdays = [];
        value.schedule.dayConstraint = "unknown";
        value.schedule.flexibility = "unknown";
      }),
    },
    {
      code: "SESSION_DURATION_REQUIRED",
      planning: resignPlanning((value) => {
        value.schedule.sessionMinutes = { target: null, hardMaximum: null };
      }),
    },
    {
      code: "EXPERIENCE_REQUIRED",
      planning: resignPlanning((value) => {
        value.trainingBackground.experience = null;
      }),
    },
    {
      code: "EQUIPMENT_REQUIRED",
      planning: resignPlanning((value) => {
        value.environment.equipmentAvailable = [];
      }),
    },
  ];
  for (const entry of cases) {
    const result = compilePlanningCoverageV1(
      entry.planning,
      PLANNER_EXERCISE_CATALOG_V1,
    );
    assert.equal(result.status, "needs_clarification", entry.code);
    assert.ok(issueCodes(result).includes(entry.code as never), entry.code);
    assert.deepEqual(result.requirements, [], entry.code);
    assert.deepEqual(validateCoverageCompilationV1(result), [], entry.code);
  }
});

test("unmapped coverage values and required-exercise ambiguity fail closed", () => {
  const cases: Array<{
    code: string;
    planning: NormalizedPlanningIntakeV1;
  }> = [
    {
      code: "UNMAPPED_PRIMARY_GOAL",
      planning: resignPlanning((value) => {
        value.goals.primary = "climbing_endurance";
      }),
    },
    {
      code: "UNMAPPED_SECONDARY_GOAL",
      planning: resignPlanning((value) => {
        value.goals.secondary = [{
          value: "climbing_endurance",
          rank: 1,
          ranking: "explicit",
        }];
      }),
    },
    {
      code: "UNMAPPED_TARGET_AREA",
      planning: resignPlanning((value) => {
        value.goals.targetAreas = [{
          value: "mobility",
          rank: 1,
          ranking: "canonical_unranked",
        }];
      }),
    },
    {
      code: "UNMAPPED_MOVEMENT_SKILL",
      planning: resignPlanning((value) => {
        value.goals.movementSkills = [{
          value: "climbing",
          rank: 1,
          ranking: "canonical_unranked",
        }];
      }),
    },
    {
      code: "REQUIRED_EXERCISE_SEMANTICS_UNAVAILABLE",
      planning: resignPlanning((value) => {
        value.preferences.requiredExerciseNames = ["dumbbell chest press"];
      }),
    },
  ];
  for (const entry of cases) {
    const result = compilePlanningCoverageV1(
      entry.planning,
      PLANNER_EXERCISE_CATALOG_V1,
    );
    assert.equal(result.status, "needs_clarification", entry.code);
    assert.ok(issueCodes(result).includes(entry.code as never), entry.code);
    assert.deepEqual(validateCoverageCompilationV1(result), [], entry.code);
  }
});

test("unsupported normalized equipment IDs are invalid, never ignored or widened", () => {
  const planning = clonePlanning("cardio-priority-4day-hybrid");
  const result = compilePlanningCoverageV1(
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.equal(result.status, "invalid_input");
  assert.deepEqual(result.issues, [{
    code: "UNSUPPORTED_EQUIPMENT_ID",
    issueClass: "invalid",
    path: "/input/planning/environment",
    values: ["available:rower"],
  }]);
  assert.deepEqual(validateCoverageCompilationV1(result), []);
});

test("hard excluded and uncomfortable exercise names resolve only through IDs or executable aliases", () => {
  const known = resignPlanning((value) => {
    value.safety.status = "restricted";
    value.safety.excludedExerciseNames = ["dumbbell chest press"];
    value.safety.uncomfortableExerciseNames = ["goblet-squat"];
  });
  const knownResult = compilePlanningCoverageV1(
    known,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.equal(knownResult.status, "ready");
  assert.deepEqual(knownResult.hardConstraints?.excludedExerciseIds, [
    "dumbbell-bench-press",
  ]);
  assert.deepEqual(knownResult.hardConstraints?.uncomfortableExerciseIds, [
    "goblet-squat",
  ]);
  assert.ok(knownResult.requirements.every(
    (entry) => !entry.compatibleExerciseIds.includes("dumbbell-bench-press")
      && !entry.compatibleExerciseIds.includes("goblet-squat"),
  ));

  const unknown = resignPlanning((value) => {
    value.safety.status = "restricted";
    value.safety.excludedExerciseNames = ["mystery lift"];
    value.safety.uncomfortableExerciseNames = ["unknown carry"];
  });
  const unknownResult = compilePlanningCoverageV1(
    unknown,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.equal(unknownResult.status, "needs_clarification");
  assert.deepEqual(issueCodes(unknownResult), [
    "UNRESOLVED_EXCLUDED_EXERCISE",
    "UNRESOLVED_UNCOMFORTABLE_EXERCISE",
  ]);
});

test("avoided equipment is enforced before candidate pools are emitted", () => {
  const planning = resignPlanning((value) => {
    value.environment.equipmentAvoided = ["dumbbells"];
  });
  const result = compilePlanningCoverageV1(
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.ok(["ready", "infeasible"].includes(result.status));
  const catalogById = new Map(
    PLANNER_EXERCISE_CATALOG_V1.exercises.map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );
  for (const entry of result.requirements) {
    for (const exerciseId of entry.compatibleExerciseIds) {
      const exercise = catalogById.get(exerciseId);
      assert.ok(exercise);
      assert.equal(exercise.environment.requiredAllEquipment.includes("dumbbells"), false);
      assert.ok(exercise.environment.requiredAnyEquipmentGroups.every(
        (group) => !group.includes("dumbbells")
          || group.some((id) => id !== "dumbbells"
            && planning.environment.equipmentAvailable.includes(id)),
      ));
    }
  }
  assert.deepEqual(validateCoverageCompilationV1(result), []);
});

test("clearance-tagged candidates fail closed under an active restriction", () => {
  const planning = resignPlanning((value) => {
    value.safety.status = "restricted";
    value.safety.movementRestrictions = [{
      code: "NO_OVERHEAD_LOADING",
      sourceText: "no overhead loading",
    }];
  });
  const catalog = resignCatalog((value) => {
    for (const exercise of value.exercises) {
      if (exercise.classification.movementPatterns.includes("squat")) {
        exercise.safety.requiresClearanceTags = ["NO_OVERHEAD_LOADING"];
      }
    }
  });
  const result = compilePlanningCoverageV1(planning, catalog);
  assert.equal(result.status, "infeasible");
  const squat = requirement(result, "coverage:squat");
  assert.deepEqual(squat.compatibleExerciseIds, []);
  const squatIssue = result.issues.find(
    (entry) => entry.values.includes("coverage:squat"),
  );
  assert.ok(squatIssue?.values.includes("CLEARANCE_REQUIRED"));
  assert.deepEqual(
    validateCoverageCompilationAgainstInputsV1(result, planning, catalog),
    [],
  );
});

test("removing equipment cannot add a compatible candidate", () => {
  const broadPlanning = clonePlanning("intermediate-freeweights-5day-strength");
  const narrowPlanning = resignPlanning(
    (value) => {
      value.environment.equipmentAvailable = ["bodyweight"];
    },
    "intermediate-freeweights-5day-strength",
  );
  const broad = compilePlanningCoverageV1(
    broadPlanning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  const narrow = compilePlanningCoverageV1(
    narrowPlanning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  for (const narrowRequirement of narrow.requirements) {
    const broadRequirement = requirement(broad, narrowRequirement.id);
    const broadIds = new Set(broadRequirement.compatibleExerciseIds);
    assert.ok(narrowRequirement.compatibleExerciseIds.every(
      (exerciseId) => broadIds.has(exerciseId),
    ), narrowRequirement.id);
  }
});

test("cardio frequency above the weekly schedule returns structured infeasibility", () => {
  const planning = resignPlanning(
    (value) => {
      value.schedule.requestedDaysPerWeek = 1;
      value.schedule.weekdays = ["monday"];
      value.preferences.cardio.priority = "primary";
      value.environment.equipmentAvailable = ["bike", "bodyweight", "dumbbells"];
    },
    "cardio-priority-4day-hybrid",
  );
  const result = compilePlanningCoverageV1(
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.equal(result.status, "infeasible");
  assert.ok(issueCodes(result).includes("WEEKLY_FREQUENCY_UNAVAILABLE"));
  assert.equal(
    requirement(result, "coverage:cycling+locomotion+walking")
      .minimumWeeklyOccurrences,
    2,
  );
  assert.deepEqual(validateCoverageCompilationV1(result), []);
});

test("semantic and nonsemantic input boundaries are deterministic", () => {
  const baselinePlanning = clonePlanning();
  const baseline = compilePlanningCoverageV1(
    baselinePlanning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  const repeated = compilePlanningCoverageV1(
    structuredClone(baselinePlanning),
    structuredClone(PLANNER_EXERCISE_CATALOG_V1),
  );
  assert.deepEqual(repeated, baseline);

  const presentationOnly = clonePlanning();
  presentationOnly.schedule.preferredTrainingTime = "morning";
  assert.deepEqual(validateNormalizedPlanningIntakeV1(presentationOnly), []);
  const presentationResult = compilePlanningCoverageV1(
    presentationOnly,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.deepEqual(presentationResult, baseline);

  const changedSchedule = resignPlanning((value) => {
    value.schedule.weekdays = ["tuesday", "thursday", "saturday"];
  });
  const changedResult = compilePlanningCoverageV1(
    changedSchedule,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  assert.notEqual(changedResult.coverageDigest, baseline.coverageDigest);
});

test("runtime validation rejects digest-consistent shape and policy contradictions", () => {
  const ready = compilePlanningCoverageV1(
    clonePlanning(),
    PLANNER_EXERCISE_CATALOG_V1,
  );
  const reordered = structuredClone(ready);
  reordered.hardConstraints?.availableEquipment.reverse();
  reordered.coverageDigest = digestCoverageCompilation(reordered);
  assert.ok(validateCoverageCompilationV1(reordered).some(
    (error) => error.includes("canonically ordered"),
  ));

  const contradictory = structuredClone(ready);
  contradictory.status = "blocked";
  contradictory.issues = [{
    code: "PLANNING_BLOCKED",
    issueClass: "clarification",
    path: "/input/planning",
    values: ["forged"],
  }];
  contradictory.coverageDigest = digestCoverageCompilation(contradictory);
  const contradictionErrors = validateCoverageCompilationV1(contradictory);
  assert.ok(contradictionErrors.some((error) => error.includes("issueClass")));
  assert.ok(contradictionErrors.some((error) => error.includes("cannot include compiled")));
});

test("input-bound verification rejects a re-signed forged candidate pool", () => {
  const planning = clonePlanning();
  const result = compilePlanningCoverageV1(
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  );
  const forged = structuredClone(result);
  forged.requirements[0].compatibleExerciseIds = ["forged-exercise"];
  forged.coverageDigest = digestCoverageCompilation(forged);
  assert.deepEqual(validateCoverageCompilationV1(forged), []);
  assert.ok(validateCoverageCompilationAgainstInputsV1(
    forged,
    planning,
    PLANNER_EXERCISE_CATALOG_V1,
  ).some((error) => error.includes("does not match recompilation")));
});

test("dedicated exact-head workflow runs the focused suite without ci.yml overlap", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-coverage-contract.yml",
    "utf8",
  );
  assert.match(
    workflow,
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/coverage\/compile\.test\.ts/,
  );
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  assert.doesNotMatch(ci, /planning\/coverage\/compile\.test\.ts/);
});

test("catalog equipment identity remains exact at the coverage boundary", () => {
  assert.ok(EQUIPMENT_IDS.includes("barbells"));
  assert.equal(EQUIPMENT_IDS.includes("barbell" as EquipmentId), false);
  assert.equal(EQUIPMENT_IDS.includes("rower" as EquipmentId), false);
});
