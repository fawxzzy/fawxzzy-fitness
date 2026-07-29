import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  digestPlanningGenerationProjection,
} from "../projection.ts";
import { PLANNER_EXERCISE_CATALOG_V1 } from "../catalog/catalog.ts";
import {
  type ExerciseCatalogBundleV1,
  type ExerciseDefinitionV1,
} from "../catalog/contract.ts";
import {
  digestExerciseCatalog,
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  compilePlanningCoverageV1,
} from "../coverage/compile.ts";
import {
  digestCoverageCompilation,
  type CoverageCompilationV1,
} from "../coverage/contract.ts";
import {
  compileCandidateRankingV1,
} from "../ranking/rank.ts";
import {
  digestCandidateRanking,
  type CandidateRankingV1,
} from "../ranking/contract.ts";
import {
  GLOBAL_SELECTION_FIXTURE_EXPECTATIONS,
  GLOBAL_SELECTION_FIXTURE_IDS,
  GLOBAL_SELECTION_FIXTURES,
  createGlobalSelectionFixtureInputs,
  type GlobalSelectionFixtureId,
} from "./fixtures.ts";
import {
  digestGlobalSelection,
  validateGlobalSelectionV1,
  validateGlobalSelectionV1WithReceipt,
  type GlobalSelectionV1,
} from "./contract.ts";
import {
  compileGlobalSelectionV1,
  validateGlobalSelectionAgainstInputsV1,
} from "./select.ts";

function resignPlanning(
  mutate: (planning: NormalizedPlanningIntakeV1) => void,
  fixtureId: GlobalSelectionFixtureId =
    "beginner-home-3day-general-strength",
) {
  const { planning } = createGlobalSelectionFixtureInputs(fixtureId);
  mutate(planning);
  planning.generationProjectionDigest =
    digestPlanningGenerationProjection(planning);
  assert.deepEqual(validateNormalizedPlanningIntakeV1(planning), []);
  return planning;
}

function resignCatalog(
  mutate: (catalog: ExerciseCatalogBundleV1) => void,
) {
  const catalog = structuredClone(
    PLANNER_EXERCISE_CATALOG_V1,
  ) as ExerciseCatalogBundleV1;
  mutate(catalog);
  catalog.catalogDigest = digestExerciseCatalog(catalog);
  assert.deepEqual(validateExerciseCatalogBundleV1(catalog), []);
  return catalog;
}

function exercise(
  catalog: ExerciseCatalogBundleV1,
  exerciseId: string,
): ExerciseDefinitionV1 {
  const value = catalog.exercises.find((entry) => entry.id === exerciseId);
  assert.ok(value, `${exerciseId} must exist`);
  return value;
}

function compile(
  planning: NormalizedPlanningIntakeV1,
  catalog: ExerciseCatalogBundleV1 =
    structuredClone(PLANNER_EXERCISE_CATALOG_V1),
) {
  const coverage = compilePlanningCoverageV1(planning, catalog);
  const ranking = compileCandidateRankingV1(planning, catalog, coverage);
  const selection = compileGlobalSelectionV1(
    planning,
    catalog,
    coverage,
    ranking,
  );
  return { coverage, ranking, selection };
}

function resignSelection(
  selection: GlobalSelectionV1,
  mutate: (value: GlobalSelectionV1) => void,
) {
  const value = structuredClone(selection);
  mutate(value);
  value.selectionDigest = digestGlobalSelection(value);
  return value;
}

function refreshObjective(selection: GlobalSelectionV1) {
  assert.ok(selection.objective);
  selection.objective.requirementCount = selection.selections.length;
  selection.objective.totalScore = selection.selections.reduce(
    (sum, entry) => sum + entry.candidateScore,
    0,
  );
  selection.objective.tieBreakVector = selection.selections.map(
    (entry) => entry.rankingPosition,
  );
}

function createSharedGobletCatalog() {
  return resignCatalog((catalog) => {
    for (const exerciseId of [
      "bodyweight-squat",
      "goblet-squat",
      "leg-press",
      "smith-machine-squat",
    ]) {
      exercise(catalog, exerciseId).classification.movementPatterns = [
        "hinge",
        "squat",
      ];
    }
  });
}

test("all ten planning fixtures produce pinned runtime-valid selection terminals", () => {
  assert.equal(GLOBAL_SELECTION_FIXTURE_IDS.length, 10);
  for (const fixtureId of GLOBAL_SELECTION_FIXTURE_IDS) {
    const result = GLOBAL_SELECTION_FIXTURES[fixtureId];
    const expected = GLOBAL_SELECTION_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(result.status, expected.status, fixtureId);
    assert.equal(result.selectionDigest, expected.digest, fixtureId);
    assert.deepEqual(validateGlobalSelectionV1(result), [], fixtureId);
    const receipt = validateGlobalSelectionV1WithReceipt(result);
    assert.equal(receipt.valid, true, fixtureId);
    assert.equal(receipt.selectionDigest, expected.digest, fixtureId);
    const { planning, catalog, coverage, ranking } =
      createGlobalSelectionFixtureInputs(fixtureId);
    assert.deepEqual(
      validateGlobalSelectionAgainstInputsV1(
        result,
        planning,
        catalog,
        coverage,
        ranking,
      ),
      [],
      fixtureId,
    );
  }
});

test("selected terminals cover every ranked requirement exactly once", () => {
  for (const fixtureId of GLOBAL_SELECTION_FIXTURE_IDS) {
    const { planning, catalog, coverage, ranking } =
      createGlobalSelectionFixtureInputs(fixtureId);
    if (ranking.status !== "ready") continue;
    const result = compileGlobalSelectionV1(
      planning,
      catalog,
      coverage,
      ranking,
    );
    assert.equal(result.status, "selected", fixtureId);
    assert.deepEqual(
      result.selections.map((entry) => entry.requirementId),
      ranking.requirements.map((entry) => entry.requirementId),
      fixtureId,
    );
    assert.equal(
      new Set(result.selections.map((entry) => entry.exerciseId)).size,
      result.selections.length,
      fixtureId,
    );
    for (const selected of result.selections) {
      const requirement = ranking.requirements.find(
        (entry) => entry.requirementId === selected.requirementId,
      );
      assert.ok(requirement);
      const candidate = requirement.candidates[
        selected.rankingPosition - 1
      ];
      assert.ok(candidate);
      assert.equal(selected.exerciseId, candidate.exerciseId);
      assert.equal(selected.candidateScore, candidate.totalScore);
      assert.equal(selected.curatedRank, candidate.curatedRank);
    }
  }
});

test("same exact inputs produce byte-identical selection identity and order", () => {
  const { planning, catalog, coverage, ranking } =
    createGlobalSelectionFixtureInputs(
      "beginner-planet-fitness-4day-muscle-gain",
    );
  const first = compileGlobalSelectionV1(
    planning,
    catalog,
    coverage,
    ranking,
  );
  const second = compileGlobalSelectionV1(
    structuredClone(planning),
    structuredClone(catalog),
    structuredClone(coverage),
    structuredClone(ranking),
  );
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
});

test("global optimization preserves a shared top candidate for the stronger fallback", () => {
  const planning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = [
      "bodyweight-glute-bridge",
      "goblet-squat",
    ];
    value.preferences.dislikedExerciseNames = [];
  });
  const catalog = createSharedGobletCatalog();
  const { ranking, selection } = compile(planning, catalog);
  const hinge = ranking.requirements.find(
    (entry) => entry.requirementId === "coverage:hinge",
  );
  const squat = ranking.requirements.find(
    (entry) => entry.requirementId === "coverage:squat",
  );
  assert.ok(hinge);
  assert.ok(squat);
  assert.equal(hinge.candidates[0].exerciseId, "goblet-squat");
  assert.equal(squat.candidates[0].exerciseId, "goblet-squat");
  assert.equal(selection.status, "selected");
  assert.equal(
    selection.selections.find(
      (entry) => entry.requirementId === "coverage:hinge",
    )?.exerciseId,
    "bodyweight-glute-bridge",
  );
  assert.equal(
    selection.selections.find(
      (entry) => entry.requirementId === "coverage:squat",
    )?.exerciseId,
    "goblet-squat",
  );
});

test("equal global scores use canonical requirement and ranking order", () => {
  const planning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = [];
    value.preferences.dislikedExerciseNames = [];
  });
  const { selection } = compile(planning, createSharedGobletCatalog());
  assert.equal(selection.status, "selected");
  assert.equal(
    selection.selections.find(
      (entry) => entry.requirementId === "coverage:hinge",
    )?.exerciseId,
    "goblet-squat",
  );
  assert.equal(
    selection.selections.find(
      (entry) => entry.requirementId === "coverage:squat",
    )?.exerciseId,
    "bodyweight-squat",
  );
});

test("a ready ranking without a perfect unique assignment is infeasible", () => {
  const planning = resignPlanning(() => {});
  const catalog = resignCatalog((value) => {
    for (const exerciseId of [
      "bodyweight-squat",
      "goblet-squat",
      "leg-press",
      "smith-machine-squat",
    ]) {
      exercise(value, exerciseId).classification.movementPatterns = [
        "hinge",
        "squat",
      ];
    }
    exercise(
      value,
      "bodyweight-glute-bridge",
    ).environment.requiredAllEquipment = ["treadmill"];
    exercise(
      value,
      "bodyweight-squat",
    ).environment.requiredAllEquipment = ["treadmill"];
  });
  const { coverage, ranking, selection } = compile(planning, catalog);
  assert.equal(coverage.status, "ready");
  assert.equal(ranking.status, "ready");
  assert.deepEqual(
    ranking.requirements
      .filter((entry) =>
        ["coverage:hinge", "coverage:squat"].includes(entry.requirementId))
      .map((entry) => [
        entry.requirementId,
        entry.candidates.map((candidate) => candidate.exerciseId),
      ]),
    [
      ["coverage:hinge", ["goblet-squat"]],
      ["coverage:squat", ["goblet-squat"]],
    ],
  );
  assert.equal(selection.status, "infeasible");
  assert.deepEqual(selection.selections, []);
  assert.equal(selection.objective, null);
  assert.deepEqual(
    selection.issues.map((entry) => entry.code),
    ["UNIQUE_ASSIGNMENT_UNAVAILABLE"],
  );
  assert.equal(validateGlobalSelectionV1WithReceipt(selection).valid, true);
});

test("non-ready rankings return valid not-selectable terminals", () => {
  for (const fixtureId of [
    "bodyweight-travel-4day-general-fitness",
    "cardio-priority-4day-hybrid",
    "no-overhead-3day-substitution",
    "ambiguous-warning-blocked",
    "pullup-priority-no-pull-equipment",
  ] as const) {
    const { planning, catalog, coverage, ranking } =
      createGlobalSelectionFixtureInputs(fixtureId);
    assert.notEqual(ranking.status, "ready");
    const result = compileGlobalSelectionV1(
      planning,
      catalog,
      coverage,
      ranking,
    );
    assert.equal(result.status, "not_selectable", fixtureId);
    assert.deepEqual(result.selections, [], fixtureId);
    assert.equal(result.objective, null, fixtureId);
    assert.deepEqual(
      result.issues.map((entry) => entry.code),
      ["RANKING_NOT_READY"],
      fixtureId,
    );
  }
});

test("invalid planning and catalog inputs produce closed invalid terminals", () => {
  const inputs = createGlobalSelectionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const planning = structuredClone(inputs.planning) as unknown as
    Record<string, unknown>;
  planning.contractVersion = "forged";
  const planningResult = compileGlobalSelectionV1(
    planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
  );
  assert.equal(planningResult.status, "invalid_input");
  assert.deepEqual(
    planningResult.issues.map((entry) => entry.code),
    ["INTAKE_INVALID"],
  );
  assert.equal(
    validateGlobalSelectionV1WithReceipt(planningResult).valid,
    true,
  );

  const catalog = structuredClone(inputs.catalog) as unknown as
    Record<string, unknown>;
  catalog.catalogVersion = "forged";
  const catalogResult = compileGlobalSelectionV1(
    inputs.planning,
    catalog,
    inputs.coverage,
    inputs.ranking,
  );
  assert.equal(catalogResult.status, "invalid_input");
  assert.deepEqual(
    catalogResult.issues.map((entry) => entry.code),
    ["CATALOG_INVALID"],
  );
});

test("malformed and input-mismatched coverage fail closed", () => {
  const inputs = createGlobalSelectionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const malformed = structuredClone(inputs.coverage) as unknown as
    Record<string, unknown>;
  malformed.status = "forged";
  const malformedResult = compileGlobalSelectionV1(
    inputs.planning,
    inputs.catalog,
    malformed,
    inputs.ranking,
  );
  assert.equal(malformedResult.status, "invalid_input");
  assert.deepEqual(
    malformedResult.issues.map((entry) => entry.code),
    ["COVERAGE_INVALID"],
  );

  const forged = structuredClone(inputs.coverage) as CoverageCompilationV1;
  forged.schedule!.sessionMinutes.target += 1;
  forged.schedule!.sessionMinutes.hardMaximum += 1;
  forged.coverageDigest = digestCoverageCompilation(forged);
  const mismatchResult = compileGlobalSelectionV1(
    inputs.planning,
    inputs.catalog,
    forged,
    inputs.ranking,
  );
  assert.equal(mismatchResult.status, "invalid_input");
  assert.deepEqual(
    mismatchResult.issues.map((entry) => entry.code),
    ["COVERAGE_INPUT_MISMATCH"],
  );
});

test("malformed and input-mismatched rankings fail closed", () => {
  const inputs = createGlobalSelectionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const malformed = structuredClone(inputs.ranking) as unknown as
    Record<string, unknown>;
  malformed.status = "forged";
  const malformedResult = compileGlobalSelectionV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    malformed,
  );
  assert.equal(malformedResult.status, "invalid_input");
  assert.deepEqual(
    malformedResult.issues.map((entry) => entry.code),
    ["RANKING_INVALID"],
  );

  const forged = structuredClone(inputs.ranking) as CandidateRankingV1;
  const multiCandidateRequirement = forged.requirements.find(
    (entry) => entry.candidates.length > 1,
  );
  assert.ok(multiCandidateRequirement);
  multiCandidateRequirement.candidates.pop();
  forged.rankingDigest = digestCandidateRanking(forged);
  const mismatchResult = compileGlobalSelectionV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    forged,
  );
  assert.equal(mismatchResult.status, "invalid_input");
  assert.deepEqual(
    mismatchResult.issues.map((entry) => entry.code),
    ["RANKING_INPUT_MISMATCH"],
  );
});

test("runtime rejects duplicate exercises and objective contradictions", () => {
  const baseline = GLOBAL_SELECTION_FIXTURES[
    "beginner-home-3day-general-strength"
  ];
  const duplicate = resignSelection(baseline, (value) => {
    value.selections[1].exerciseId = value.selections[0].exerciseId;
  });
  assert.ok(
    validateGlobalSelectionV1(duplicate).some(
      (error) => error.includes("globally unique exercise IDs"),
    ),
  );

  const objective = resignSelection(baseline, (value) => {
    assert.ok(value.objective);
    value.objective.totalScore += 1;
  });
  assert.ok(
    validateGlobalSelectionV1(objective).some(
      (error) => error.includes("selected score sum"),
    ),
  );
});

test("runtime rejects digest and canonical-order tampering", () => {
  const digestTamper = structuredClone(
    GLOBAL_SELECTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  digestTamper.selectionDigest = "0".repeat(64);
  assert.ok(
    validateGlobalSelectionV1(digestTamper).some(
      (error) => error.includes("semantic selection projection"),
    ),
  );

  const reordered = resignSelection(
    GLOBAL_SELECTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
    (value) => {
      value.selections.reverse();
      refreshObjective(value);
    },
  );
  assert.ok(
    validateGlobalSelectionV1(reordered).some(
      (error) => error.includes("canonically ordered by requirement ID"),
    ),
  );
});

test("digest-consistent status and upstream-state contradictions fail closed", () => {
  const notSelectable = resignSelection(
    GLOBAL_SELECTION_FIXTURES[
      "ambiguous-warning-blocked"
    ],
    (value) => {
      value.input.rankingStatus = "invalid_input";
      value.input.coverageStatus = "ready";
    },
  );
  const notSelectableErrors = validateGlobalSelectionV1(notSelectable);
  assert.ok(
    notSelectableErrors.some(
      (error) => error.includes("rankingStatus not_rankable"),
    ),
  );
  assert.ok(
    notSelectableErrors.some(
      (error) => error.includes("non-ready coverage status"),
    ),
  );

  const planning = resignPlanning(() => {});
  const catalog = resignCatalog((value) => {
    for (const exerciseId of [
      "bodyweight-squat",
      "goblet-squat",
      "leg-press",
      "smith-machine-squat",
    ]) {
      exercise(value, exerciseId).classification.movementPatterns = [
        "hinge",
        "squat",
      ];
    }
    exercise(
      value,
      "bodyweight-glute-bridge",
    ).environment.requiredAllEquipment = ["treadmill"];
    exercise(
      value,
      "bodyweight-squat",
    ).environment.requiredAllEquipment = ["treadmill"];
  });
  const infeasible = compile(planning, catalog).selection;
  assert.equal(infeasible.status, "infeasible");
  const contradictory = resignSelection(infeasible, (value) => {
    value.input.coverageStatus = "blocked";
  });
  assert.ok(
    validateGlobalSelectionV1(contradictory).some(
      (error) => error.includes("coverageStatus ready"),
    ),
  );
});

test("input-bound validation rejects self-consistent omission and injection", () => {
  const inputs = createGlobalSelectionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const baseline = compileGlobalSelectionV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
  );
  const omitted = resignSelection(baseline, (value) => {
    value.selections.pop();
    refreshObjective(value);
  });
  assert.deepEqual(validateGlobalSelectionV1(omitted), []);
  assert.ok(
    validateGlobalSelectionAgainstInputsV1(
      omitted,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
    ).some((error) => error.includes("does not match recompilation")),
  );

  const injected = resignSelection(baseline, (value) => {
    value.selections[0].exerciseId = "leg-press";
  });
  assert.deepEqual(validateGlobalSelectionV1(injected), []);
  assert.ok(
    validateGlobalSelectionAgainstInputsV1(
      injected,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
    ).some((error) => error.includes("does not match recompilation")),
  );
});

test("selected exercises remain inside coverage and ranking eligibility", () => {
  for (const fixtureId of GLOBAL_SELECTION_FIXTURE_IDS) {
    const inputs = createGlobalSelectionFixtureInputs(fixtureId);
    const result = compileGlobalSelectionV1(
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
    );
    if (result.status !== "selected") continue;
    for (const selected of result.selections) {
      const coverageRequirement = inputs.coverage.requirements.find(
        (entry) => entry.id === selected.requirementId,
      );
      const rankingRequirement = inputs.ranking.requirements.find(
        (entry) => entry.requirementId === selected.requirementId,
      );
      assert.ok(coverageRequirement);
      assert.ok(rankingRequirement);
      assert.ok(
        coverageRequirement.compatibleExerciseIds.includes(
          selected.exerciseId,
        ),
      );
      assert.ok(
        rankingRequirement.candidates.some(
          (candidate) => candidate.exerciseId === selected.exerciseId,
        ),
      );
    }
  }
});

test("issue code, class, and path semantics are closed", () => {
  const inputs = createGlobalSelectionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const planning = structuredClone(inputs.planning) as unknown as
    Record<string, unknown>;
  planning.contractVersion = "forged";
  const invalid = compileGlobalSelectionV1(
    planning,
    inputs.catalog,
    inputs.coverage,
    inputs.ranking,
  );
  const forged = resignSelection(invalid, (value) => {
    value.issues[0].path = "/totally/unknown";
  });
  assert.ok(
    validateGlobalSelectionV1(forged).some(
      (error) => error.includes("path must equal /input/planning"),
    ),
  );
});

test("malformed transports fail closed through the public receipt without throwing", () => {
  const selected = structuredClone(
    GLOBAL_SELECTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  ) as unknown as Record<string, unknown>;
  const notSelectable = structuredClone(
    GLOBAL_SELECTION_FIXTURES[
      "ambiguous-warning-blocked"
    ],
  ) as unknown as Record<string, unknown>;
  const cases: Array<{
    name: string;
    value: Record<string, unknown>;
    mutate: (value: Record<string, unknown>) => void;
  }> = [
    {
      name: "missing objective",
      value: selected,
      mutate(value) {
        delete value.objective;
      },
    },
    {
      name: "null selections",
      value: selected,
      mutate(value) {
        value.selections = null;
      },
    },
    {
      name: "missing issue values",
      value: notSelectable,
      mutate(value) {
        const issues = value.issues as Array<Record<string, unknown>>;
        delete issues[0].values;
      },
    },
  ];
  for (const entry of cases) {
    const malformed = structuredClone(entry.value);
    entry.mutate(malformed);
    let receipt: ReturnType<typeof validateGlobalSelectionV1WithReceipt>
      | undefined;
    assert.doesNotThrow(() => {
      receipt = validateGlobalSelectionV1WithReceipt(malformed);
    }, entry.name);
    assert.equal(receipt?.valid, false, entry.name);
    assert.ok((receipt?.errors.length ?? 0) > 0, entry.name);
  }
});

test("input identity forgery remains runtime-consistent but input-bound invalid", () => {
  const inputs = createGlobalSelectionFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const forged = resignSelection(
    GLOBAL_SELECTION_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
    (value) => {
      value.input.rankingDigest = "a".repeat(64);
    },
  );
  assert.deepEqual(validateGlobalSelectionV1(forged), []);
  assert.ok(
    validateGlobalSelectionAgainstInputsV1(
      forged,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
      inputs.ranking,
    ).some((error) => error.includes("does not match recompilation")),
  );
});

test("the dedicated workflow watches the full dependency tree and runs this suite directly", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-selection-contract.yml",
    "utf8",
  );
  assert.equal(
    workflow.match(/src\/features\/curated-onboarding\/\*\*/g)?.length,
    2,
  );
  assert.equal(
    workflow.includes("src/features/curated-onboarding/planning/**"),
    false,
  );
  assert.match(
    workflow,
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/selection\/select\.test\.ts/,
  );
  assert.match(workflow, /docs\/curated-planning-contract\.md/);
  assert.match(workflow, /docs\/PLAYBOOK_NOTES\.md/);
});
