import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { NORMALIZED_PLANNING_FIXTURES } from "../fixtures.ts";
import { PLANNER_EXERCISE_CATALOG_V1 } from "./catalog.ts";
import {
  EQUIPMENT_IDS,
  EXERCISE_CATALOG_V1_SCHEMA,
  type CatalogCandidateQueryV1,
  type EquipmentId,
  type ExerciseCatalogBundleV1,
  type ExperienceLevel,
  type MovementPattern,
  type RestrictionCode,
} from "./contract.ts";
import {
  digestExerciseCatalog,
  resolveCatalogCandidates,
  validateExerciseCatalogBundleV1,
} from "./validate.ts";

const PINNED_CATALOG_DIGEST = "5969eed17e934b96b1c38b40f4a3e7cde670565d562b4f3cb2adce6681bef940";

function cloneCatalog() {
  return structuredClone(PLANNER_EXERCISE_CATALOG_V1);
}

function resign(catalog: ExerciseCatalogBundleV1) {
  catalog.catalogDigest = digestExerciseCatalog(catalog);
  return catalog;
}

function query(
  movementPattern: MovementPattern,
  availableEquipment: EquipmentId[],
  options: {
    avoidedEquipment?: EquipmentId[];
    restrictionCodes?: RestrictionCode[];
    experience?: ExperienceLevel;
  } = {},
): CatalogCandidateQueryV1 {
  return {
    movementPatterns: [movementPattern],
    availableEquipment: [...availableEquipment].sort(),
    avoidedEquipment: [...(options.avoidedEquipment ?? [])].sort(),
    restrictionCodes: [...(options.restrictionCodes ?? [])].sort(),
    experience: options.experience ?? "advanced",
  };
}

function availableIds(
  movementPattern: MovementPattern,
  availableEquipment: EquipmentId[],
  options?: Parameters<typeof query>[2],
) {
  const result = resolveCatalogCandidates(
    PLANNER_EXERCISE_CATALOG_V1,
    query(movementPattern, availableEquipment, options),
  );
  return result.status === "available" ? result.compatibleExerciseIds : [];
}

test("planner catalog validates with a pinned semantic digest", () => {
  assert.deepEqual(validateExerciseCatalogBundleV1(PLANNER_EXERCISE_CATALOG_V1), []);
  assert.equal(PLANNER_EXERCISE_CATALOG_V1.exercises.length, 27);
  assert.equal(PLANNER_EXERCISE_CATALOG_V1.substitutionRules.length, 17);
  assert.equal(PLANNER_EXERCISE_CATALOG_V1.catalogDigest, PINNED_CATALOG_DIGEST);
  assert.equal(digestExerciseCatalog(PLANNER_EXERCISE_CATALOG_V1), PINNED_CATALOG_DIGEST);
});

test("catalog JSON schema closes root and nested executable records", () => {
  assert.equal(EXERCISE_CATALOG_V1_SCHEMA.additionalProperties, false);
  assert.equal(
    EXERCISE_CATALOG_V1_SCHEMA.properties.exercises.items.additionalProperties,
    false,
  );
  assert.equal(
    EXERCISE_CATALOG_V1_SCHEMA.properties.exercises.items.properties.safety.additionalProperties,
    false,
  );
  assert.equal(
    EXERCISE_CATALOG_V1_SCHEMA.properties.substitutionRules.items.additionalProperties,
    false,
  );
  assert.deepEqual(
    EXERCISE_CATALOG_V1_SCHEMA.properties.equipment.items.properties.id.enum,
    EQUIPMENT_IDS,
  );
});

test("required pull-request CI executes the focused catalog contract directly", () => {
  const workflow = fs.readFileSync(
    path.join(process.cwd(), ".github", "workflows", "ci.yml"),
    "utf8",
  );
  assert.match(
    workflow,
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/catalog\/catalog\.test\.ts/,
  );
});

test("every planner exercise references the existing canonical catalog exactly", () => {
  const indexPath = path.join(
    process.cwd(),
    "supabase",
    "data",
    "global_exercises_catalog_index.json",
  );
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
    exercises?: Array<{ slug?: string; name?: string }>;
  };
  const canonicalNames = new Map(
    (index.exercises ?? []).map((exercise) => [exercise.slug, exercise.name]),
  );

  for (const exercise of PLANNER_EXERCISE_CATALOG_V1.exercises) {
    assert.equal(
      canonicalNames.get(exercise.id),
      exercise.canonicalName,
      `${exercise.id} must match the canonical generated catalog index`,
    );
  }
});

test("presentation-only canonical names do not alter semantic identity", () => {
  const renamed = cloneCatalog();
  renamed.exercises[0].canonicalName = "Localized display copy";
  assert.equal(digestExerciseCatalog(renamed), PLANNER_EXERCISE_CATALOG_V1.catalogDigest);
  assert.deepEqual(validateExerciseCatalogBundleV1(renamed), []);

  const presentationCollision = cloneCatalog();
  presentationCollision.exercises[0].canonicalName =
    presentationCollision.exercises[1].canonicalName;
  assert.equal(
    digestExerciseCatalog(presentationCollision),
    PLANNER_EXERCISE_CATALOG_V1.catalogDigest,
  );
  assert.deepEqual(validateExerciseCatalogBundleV1(presentationCollision), []);

  const semanticAliasChange = cloneCatalog();
  semanticAliasChange.exercises[0].aliases.push("new matching alias");
  semanticAliasChange.exercises[0].aliases.sort();
  assert.notEqual(
    digestExerciseCatalog(semanticAliasChange),
    PLANNER_EXERCISE_CATALOG_V1.catalogDigest,
  );
});

test("validator rejects forged and internally contradictory catalog semantics", () => {
  const cases: Array<{
    name: string;
    mutate: (catalog: ExerciseCatalogBundleV1) => void;
    expected: RegExp;
    resign?: boolean;
  }> = [
    {
      name: "unknown root field",
      mutate: (catalog) => {
        (catalog as unknown as Record<string, unknown>).forged = true;
      },
      expected: /must contain exactly/,
    },
    {
      name: "unknown nested field",
      mutate: (catalog) => {
        (catalog.exercises[0].safety as unknown as Record<string, unknown>).diagnosis = "none";
      },
      expected: /safety must contain exactly/,
    },
    {
      name: "duplicate exercise id",
      mutate: (catalog) => {
        catalog.exercises[1].id = catalog.exercises[0].id;
      },
      expected: /ids must be unique/,
    },
    {
      name: "equipment kind redefinition",
      mutate: (catalog) => {
        catalog.equipment[0].kind = "station";
      },
      expected: /frozen equipment policy/,
    },
    {
      name: "restriction policy redefinition",
      mutate: (catalog) => {
        catalog.restrictions[0].deniedDemandTags = ["overhead_loading"];
      },
      expected: /frozen restriction policy/,
    },
    {
      name: "prescription policy redefinition",
      mutate: (catalog) => {
        catalog.prescriptionClasses[0].supportedProgressionModes = ["duration"];
      },
      expected: /frozen prescription-class policy/,
    },
    {
      name: "active exercise without approved review",
      mutate: (catalog) => {
        catalog.exercises[0].safety.reviewStatus = "pending";
      },
      expected: /must have approved safety review/,
    },
    {
      name: "unknown required equipment",
      mutate: (catalog) => {
        (catalog.exercises[0].environment.requiredAllEquipment as string[])[0] = "generic-machine";
      },
      expected: /unsupported/,
    },
    {
      name: "restriction exclusions not derived from demand tags",
      mutate: (catalog) => {
        catalog.exercises[0].safety.excludedByRestrictionTags = ["NO_OVERHEAD_LOADING"];
      },
      expected: /not derived canonically/,
    },
    {
      name: "fabricated starting load policy",
      mutate: (catalog) => {
        (catalog.exercises[0].prescriptionSupport as unknown as Record<string, unknown>)
          .startingLoadPolicy = "estimate";
      },
      expected: /must equal unset/,
    },
    {
      name: "unsupported progression mode",
      mutate: (catalog) => {
        catalog.exercises[0].prescriptionSupport.supportedProgressionModes = ["duration"];
      },
      expected: /not supported by its classes/,
    },
    {
      name: "dangling substitution candidate",
      mutate: (catalog) => {
        catalog.substitutionRules[0].candidateExerciseIds[0] = "missing-exercise";
        catalog.substitutionRules[0].candidateExerciseIds.sort();
      },
      expected: /must be active/,
    },
    {
      name: "movement-changing substitution",
      mutate: (catalog) => {
        catalog.substitutionRules[0].candidateExerciseIds[0] = "incline-walk";
        catalog.substitutionRules[0].candidateExerciseIds.sort();
      },
      expected: /changes movement patterns|lacks the equivalence class/,
    },
    {
      name: "self-referencing substitution",
      mutate: (catalog) => {
        catalog.substitutionRules[0].candidateExerciseIds[0] =
          catalog.substitutionRules[0].sourceExerciseId;
        catalog.substitutionRules[0].candidateExerciseIds.sort();
      },
      expected: /cannot reference its source/,
    },
    {
      name: "non-canonical exercise order",
      mutate: (catalog) => {
        [catalog.exercises[0], catalog.exercises[1]] = [
          catalog.exercises[1],
          catalog.exercises[0],
        ];
      },
      expected: /canonical exercise-id ordering/,
    },
    {
      name: "forged digest",
      mutate: (catalog) => {
        catalog.catalogDigest = "0".repeat(64);
      },
      expected: /does not match the semantic catalog projection/,
      resign: false,
    },
  ];

  for (const item of cases) {
    const catalog = cloneCatalog();
    item.mutate(catalog);
    if (item.resign !== false && !item.name.includes("unknown")) {
      resign(catalog);
    }
    const errors = validateExerciseCatalogBundleV1(catalog);
    assert.ok(
      errors.some((error) => item.expected.test(error)),
      `${item.name} should fail closed; got ${JSON.stringify(errors)}`,
    );
  }
});

test("narrow equipment capabilities are never widened into broader classes", () => {
  assert.deepEqual(availableIds("walking", ["treadmill"]), ["incline-walk"]);
  assert.deepEqual(availableIds("walking", ["machines"]), []);
  assert.deepEqual(availableIds("cycling", ["bike"]), ["stationary-bike"]);
  assert.deepEqual(availableIds("cycling", ["treadmill"]), []);
  assert.deepEqual(availableIds("vertical_pull", ["cables"]), ["lat-pulldown"]);
  assert.deepEqual(availableIds("vertical_pull", ["machines"]), []);
  assert.deepEqual(availableIds("squat", ["smith-machine"]), ["smith-machine-squat"]);
  assert.deepEqual(availableIds("squat", ["machines"]), ["leg-extension", "leg-press"]);
});

test("explicit equipment avoidance remains a hard compatibility filter", () => {
  assert.deepEqual(
    availableIds("squat", ["machines", "smith-machine"], {
      avoidedEquipment: ["machines"],
    }),
    ["smith-machine-squat"],
  );
  const unavailable = resolveCatalogCandidates(
    PLANNER_EXERCISE_CATALOG_V1,
    query("squat", ["machines"], { avoidedEquipment: ["machines"] }),
  );
  assert.equal(unavailable.status, "unavailable");
  if (unavailable.status === "unavailable") {
    assert.ok(unavailable.reasonCodes.includes("EQUIPMENT_AVOIDED"));
  }
});

test("restrictions are monotonic and substitutions cannot bypass the same filter", () => {
  const unrestricted = availableIds(
    "vertical_push",
    ["bench", "bodyweight", "dumbbells", "machines", "smith-machine"],
  );
  const restricted = availableIds(
    "vertical_push",
    ["bench", "bodyweight", "dumbbells", "machines", "smith-machine"],
    { restrictionCodes: ["NO_OVERHEAD_LOADING"] },
  );
  assert.ok(unrestricted.length > 0);
  assert.deepEqual(restricted, []);

  const restrictedResult = resolveCatalogCandidates(
    PLANNER_EXERCISE_CATALOG_V1,
    query(
      "vertical_push",
      ["bench", "bodyweight", "dumbbells", "machines", "smith-machine"],
      { restrictionCodes: ["NO_OVERHEAD_LOADING"] },
    ),
  );
  assert.equal(restrictedResult.status, "unavailable");
  if (restrictedResult.status === "unavailable") {
    assert.deepEqual(restrictedResult.reasonCodes, ["RESTRICTION_CONFLICT"]);
  }
});

test("clearance-tagged exercises fail closed without positive clearance evidence", () => {
  const catalog = cloneCatalog();
  const squat = catalog.exercises.find((exercise) => exercise.id === "bodyweight-squat");
  assert.ok(squat);
  squat.safety.requiresClearanceTags = ["NO_AXIAL_LOADING"];
  resign(catalog);
  assert.deepEqual(validateExerciseCatalogBundleV1(catalog), []);

  const result = resolveCatalogCandidates(
    catalog,
    query("squat", ["bodyweight"], {
      experience: "beginner",
      restrictionCodes: ["NO_AXIAL_LOADING"],
    }),
  );
  assert.equal(result.status, "unavailable");
  if (result.status === "unavailable") {
    assert.ok(result.reasonCodes.includes("CLEARANCE_REQUIRED"));
    assert.deepEqual(
      result.rejectedCandidates.find(
        (candidate) => candidate.exerciseId === "bodyweight-squat",
      ),
      {
        exerciseId: "bodyweight-squat",
        reasonCodes: ["CLEARANCE_REQUIRED"],
      },
    );
  }
});

test("removing equipment never introduces a new compatible exercise", () => {
  const broad = new Set(availableIds(
    "squat",
    ["bodyweight", "dumbbells", "machines", "smith-machine"],
  ));
  const narrow = availableIds("squat", ["bodyweight"]);
  assert.ok(narrow.length > 0);
  assert.ok(narrow.every((id) => broad.has(id)));
});

test("selected normalization fixtures have explicit catalog support or infeasibility evidence", () => {
  const supportedPatterns: Record<string, MovementPattern[]> = {
    "beginner-home-3day-general-strength": [
      "hinge",
      "horizontal_pull",
      "horizontal_push",
      "squat",
      "trunk_bracing",
    ],
    "beginner-planet-fitness-4day-muscle-gain": [
      "hinge",
      "horizontal_pull",
      "horizontal_push",
      "squat",
      "trunk_bracing",
      "vertical_pull",
      "walking",
    ],
    "time-limited-3day-30min": [
      "hinge",
      "horizontal_pull",
      "horizontal_push",
      "squat",
      "trunk_bracing",
      "vertical_pull",
    ],
    "bodyweight-travel-4day-general-fitness": [
      "hinge",
      "horizontal_push",
      "squat",
      "trunk_bracing",
    ],
    "no-overhead-3day-substitution": [
      "hinge",
      "horizontal_pull",
      "horizontal_push",
      "squat",
      "trunk_bracing",
    ],
    "pullup-priority-no-pull-equipment": [
      "hinge",
      "horizontal_pull",
      "horizontal_push",
      "squat",
      "trunk_bracing",
    ],
  };

  for (const [fixtureId, patterns] of Object.entries(supportedPatterns)) {
    const fixture = NORMALIZED_PLANNING_FIXTURES[
      fixtureId as keyof typeof NORMALIZED_PLANNING_FIXTURES
    ];
    const unmappedEquipment = fixture.environment.equipmentAvailable.filter(
      (id) => !EQUIPMENT_IDS.includes(id as EquipmentId),
    );
    assert.deepEqual(unmappedEquipment, [], `${fixtureId} equipment must be catalog-governed`);
    const availableEquipment = fixture.environment.equipmentAvailable as EquipmentId[];
    const avoidedEquipment = fixture.environment.equipmentAvoided as EquipmentId[];
    const restrictionCodes = fixture.safety.movementRestrictions
      .map((restriction) => restriction.code) as RestrictionCode[];
    const experience = fixture.trainingBackground.experience as ExperienceLevel;

    for (const pattern of patterns) {
      const result = resolveCatalogCandidates(PLANNER_EXERCISE_CATALOG_V1, {
        movementPatterns: [pattern],
        availableEquipment,
        avoidedEquipment,
        restrictionCodes,
        experience,
      });
      assert.equal(
        result.status,
        "available",
        `${fixtureId} should support ${pattern}: ${JSON.stringify(result)}`,
      );
    }
  }

  const travel = NORMALIZED_PLANNING_FIXTURES["bodyweight-travel-4day-general-fitness"];
  const travelPull = resolveCatalogCandidates(PLANNER_EXERCISE_CATALOG_V1, {
    movementPatterns: ["vertical_pull"],
    availableEquipment: travel.environment.equipmentAvailable as EquipmentId[],
    avoidedEquipment: [],
    restrictionCodes: [],
    experience: travel.trainingBackground.experience as ExperienceLevel,
  });
  assert.equal(travelPull.status, "unavailable");
  if (travelPull.status === "unavailable") {
    assert.ok(travelPull.reasonCodes.includes("EQUIPMENT_UNAVAILABLE"));
  }

  const noPull = NORMALIZED_PLANNING_FIXTURES["pullup-priority-no-pull-equipment"];
  const noPullResult = resolveCatalogCandidates(PLANNER_EXERCISE_CATALOG_V1, {
    movementPatterns: ["vertical_pull"],
    availableEquipment: noPull.environment.equipmentAvailable as EquipmentId[],
    avoidedEquipment: [],
    restrictionCodes: [],
    experience: noPull.trainingBackground.experience as ExperienceLevel,
  });
  assert.equal(noPullResult.status, "unavailable");
  if (noPullResult.status === "unavailable") {
    assert.ok(noPullResult.reasonCodes.includes("EQUIPMENT_UNAVAILABLE"));
  }

  const noOverhead = NORMALIZED_PLANNING_FIXTURES["no-overhead-3day-substitution"];
  const noOverheadResult = resolveCatalogCandidates(PLANNER_EXERCISE_CATALOG_V1, {
    movementPatterns: ["vertical_push"],
    availableEquipment: noOverhead.environment.equipmentAvailable as EquipmentId[],
    avoidedEquipment: [],
    restrictionCodes: ["NO_OVERHEAD_LOADING"],
    experience: noOverhead.trainingBackground.experience as ExperienceLevel,
  });
  assert.equal(noOverheadResult.status, "unavailable");
  if (noOverheadResult.status === "unavailable") {
    assert.ok(noOverheadResult.reasonCodes.includes("RESTRICTION_CONFLICT"));
  }
});

test("invalid catalogs and candidate requests return structured fail-closed results", () => {
  const invalidCatalog = cloneCatalog();
  invalidCatalog.catalogDigest = "0".repeat(64);
  const invalidCatalogResult = resolveCatalogCandidates(
    invalidCatalog,
    query("squat", ["bodyweight"]),
  );
  assert.equal(invalidCatalogResult.status, "invalid_catalog");

  const invalidQuery = query("squat", ["bodyweight"]);
  (invalidQuery.movementPatterns as string[]).push("not-a-pattern");
  const invalidQueryResult = resolveCatalogCandidates(
    PLANNER_EXERCISE_CATALOG_V1,
    invalidQuery,
  );
  assert.equal(invalidQueryResult.status, "invalid_request");
});
