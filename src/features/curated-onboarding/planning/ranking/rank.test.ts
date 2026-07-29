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
} from "../catalog/contract.ts";
import {
  digestExerciseCatalog,
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  compilePlanningCoverageV1,
} from "../coverage/compile.ts";
import {
  type CoverageCompilationV1,
} from "../coverage/contract.ts";
import {
  CANDIDATE_RANKING_FIXTURE_EXPECTATIONS,
  CANDIDATE_RANKING_FIXTURE_IDS,
  CANDIDATE_RANKING_FIXTURES,
  createCandidateRankingFixtureInputs,
  type CandidateRankingFixtureId,
} from "./fixtures.ts";
import {
  compareRankedExerciseCandidates,
  digestCandidateRanking,
  validateCandidateRankingV1,
  validateCandidateRankingV1WithReceipt,
  type CandidateRankingV1,
  type RankedExerciseCandidateV1,
} from "./contract.ts";
import {
  compileCandidateRankingV1,
  validateCandidateRankingAgainstInputsV1,
} from "./rank.ts";

function resignPlanning(
  mutate: (planning: NormalizedPlanningIntakeV1) => void,
  fixtureId: CandidateRankingFixtureId =
    "beginner-home-3day-general-strength",
) {
  const { planning } = createCandidateRankingFixtureInputs(fixtureId);
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

function compile(
  planning: NormalizedPlanningIntakeV1,
  catalog: ExerciseCatalogBundleV1 =
    structuredClone(PLANNER_EXERCISE_CATALOG_V1),
) {
  const coverage = compilePlanningCoverageV1(planning, catalog);
  const ranking = compileCandidateRankingV1(planning, catalog, coverage);
  return { coverage, ranking };
}

function findCandidate(
  ranking: CandidateRankingV1,
  requirementId: string,
  exerciseId: string,
) {
  const candidate = ranking.requirements
    .find((requirement) => requirement.requirementId === requirementId)
    ?.candidates.find((entry) => entry.exerciseId === exerciseId);
  assert.ok(candidate, `${requirementId} must contain ${exerciseId}`);
  return candidate;
}

function resignRanking(
  ranking: CandidateRankingV1,
  mutate: (value: CandidateRankingV1) => void,
) {
  const value = structuredClone(ranking);
  mutate(value);
  value.rankingDigest = digestCandidateRanking(value);
  return value;
}

function exercise(
  catalog: ExerciseCatalogBundleV1,
  exerciseId: string,
) {
  const value = catalog.exercises.find((entry) => entry.id === exerciseId);
  assert.ok(value, `${exerciseId} must exist`);
  return value;
}

test("all ten planning fixtures produce pinned runtime-valid ranking terminals", () => {
  assert.equal(CANDIDATE_RANKING_FIXTURE_IDS.length, 10);
  for (const fixtureId of CANDIDATE_RANKING_FIXTURE_IDS) {
    const result = CANDIDATE_RANKING_FIXTURES[fixtureId];
    const expected = CANDIDATE_RANKING_FIXTURE_EXPECTATIONS[fixtureId];
    assert.equal(result.status, expected.status, fixtureId);
    assert.equal(result.rankingDigest, expected.digest, fixtureId);
    assert.deepEqual(validateCandidateRankingV1(result), [], fixtureId);
    const receipt = validateCandidateRankingV1WithReceipt(result);
    assert.equal(receipt.valid, true, fixtureId);
    assert.equal(receipt.rankingDigest, expected.digest, fixtureId);
    const { planning, catalog, coverage } =
      createCandidateRankingFixtureInputs(fixtureId);
    assert.deepEqual(
      validateCandidateRankingAgainstInputsV1(
        result,
        planning,
        catalog,
        coverage,
      ),
      [],
      fixtureId,
    );
  }
});

test("ready rankings include every compatible candidate exactly once", () => {
  for (const fixtureId of CANDIDATE_RANKING_FIXTURE_IDS) {
    const { planning, catalog, coverage } =
      createCandidateRankingFixtureInputs(fixtureId);
    if (coverage.status !== "ready") continue;
    const ranking = compileCandidateRankingV1(planning, catalog, coverage);
    assert.equal(ranking.status, "ready", fixtureId);
    assert.deepEqual(
      ranking.requirements.map((requirement) => requirement.requirementId),
      coverage.requirements.map((requirement) => requirement.id),
      fixtureId,
    );
    for (const coverageRequirement of coverage.requirements) {
      const ranked = ranking.requirements.find(
        (requirement) =>
          requirement.requirementId === coverageRequirement.id,
      );
      assert.ok(ranked, coverageRequirement.id);
      assert.deepEqual(
        [...ranked.candidates.map((candidate) => candidate.exerciseId)].sort(),
        [...coverageRequirement.compatibleExerciseIds].sort(),
        coverageRequirement.id,
      );
      assert.equal(
        new Set(ranked.candidates.map((candidate) => candidate.exerciseId)).size,
        ranked.candidates.length,
      );
      assert.deepEqual(
        ranked.candidates,
        [...ranked.candidates].sort(compareRankedExerciseCandidates),
      );
    }
  }
});

test("same exact inputs produce byte-identical ranking identity and order", () => {
  const { planning, catalog, coverage } =
    createCandidateRankingFixtureInputs(
      "beginner-planet-fitness-4day-muscle-gain",
    );
  const first = compileCandidateRankingV1(planning, catalog, coverage);
  const second = compileCandidateRankingV1(
    structuredClone(planning),
    structuredClone(catalog),
    structuredClone(coverage),
  );
  assert.deepEqual(second, first);
  assert.equal(
    JSON.stringify(second),
    JSON.stringify(first),
  );
});

test("score ties use curated rank before lexical exercise ID", () => {
  const planning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = [];
    value.preferences.dislikedExerciseNames = [];
  });
  const curatedCatalog = resignCatalog((catalog) => {
    const bodyweight = exercise(catalog, "bodyweight-squat");
    const goblet = exercise(catalog, "goblet-squat");
    bodyweight.selection = structuredClone(goblet.selection);
    bodyweight.suitability = structuredClone(goblet.suitability);
    bodyweight.safety.systemicFatigue = goblet.safety.systemicFatigue;
    bodyweight.cost = structuredClone(goblet.cost);
    bodyweight.selection.curatedRank = 2;
    goblet.selection.curatedRank = 1;
  });
  const curated = compile(planning, curatedCatalog).ranking;
  const curatedOrder = curated.requirements
    .find((entry) => entry.requirementId === "coverage:squat")
    ?.candidates.map((candidate) => candidate.exerciseId);
  assert.deepEqual(curatedOrder, ["goblet-squat", "bodyweight-squat"]);

  const lexicalCatalog = resignCatalog((catalog) => {
    const bodyweight = exercise(catalog, "bodyweight-squat");
    const goblet = exercise(catalog, "goblet-squat");
    bodyweight.selection = structuredClone(goblet.selection);
    bodyweight.suitability = structuredClone(goblet.suitability);
    bodyweight.safety.systemicFatigue = goblet.safety.systemicFatigue;
    bodyweight.cost = structuredClone(goblet.cost);
    bodyweight.selection.curatedRank = 1;
    goblet.selection.curatedRank = 1;
  });
  const lexical = compile(planning, lexicalCatalog).ranking;
  const lexicalOrder = lexical.requirements
    .find((entry) => entry.requirementId === "coverage:squat")
    ?.candidates.map((candidate) => candidate.exerciseId);
  assert.deepEqual(lexicalOrder, ["bodyweight-squat", "goblet-squat"]);
});

test("exact preferred and disliked names move only the preference component", () => {
  const neutralPlanning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = [];
    value.preferences.dislikedExerciseNames = [];
  });
  const neutral = compile(neutralPlanning).ranking;
  const neutralPushUp = findCandidate(
    neutral,
    "coverage:horizontal_push",
    "push-up",
  );

  const preferredPlanning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = ["push up"];
    value.preferences.dislikedExerciseNames = [];
  });
  const preferred = findCandidate(
    compile(preferredPlanning).ranking,
    "coverage:horizontal_push",
    "push-up",
  );
  assert.equal(
    preferred.scoreComponents.preference
      - neutralPushUp.scoreComponents.preference,
    16,
  );
  assert.equal(preferred.reasonCodes[2], "PREFERENCE_PREFERRED");

  const dislikedPlanning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = [];
    value.preferences.dislikedExerciseNames = ["push up"];
  });
  const disliked = findCandidate(
    compile(dislikedPlanning).ranking,
    "coverage:horizontal_push",
    "push-up",
  );
  assert.equal(
    disliked.scoreComponents.preference
      - neutralPushUp.scoreComponents.preference,
    -16,
  );
  assert.equal(disliked.reasonCodes[2], "PREFERENCE_DISLIKED");
});

test("contradictory preference names are neutral and deterministic", () => {
  const planning = resignPlanning((value) => {
    value.preferences.preferredExerciseNames = ["push up"];
    value.preferences.dislikedExerciseNames = ["push up"];
  });
  const candidate = findCandidate(
    compile(planning).ranking,
    "coverage:horizontal_push",
    "push-up",
  );
  assert.equal(candidate.scoreComponents.preference, 0);
  assert.equal(candidate.reasonCodes[2], "PREFERENCE_CONFLICT_NEUTRAL");
});

test("conservative recovery penalizes high systemic fatigue without changing eligibility", () => {
  const standard = createCandidateRankingFixtureInputs(
    "beginner-planet-fitness-4day-muscle-gain",
  );
  const standardRanking = compileCandidateRankingV1(
    standard.planning,
    standard.catalog,
    standard.coverage,
  );
  const standardSmith = findCandidate(
    standardRanking,
    "coverage:hinge",
    "smith-machine-romanian-deadlift",
  );
  const conservativePlanning = resignPlanning((value) => {
    value.recovery.planningModifier = "conservative";
    value.recovery.modifierReasons = ["adversarial-test"];
  }, "beginner-planet-fitness-4day-muscle-gain");
  const conservative = compile(conservativePlanning);
  assert.equal(conservative.coverage.status, "ready");
  const conservativeSmith = findCandidate(
    conservative.ranking,
    "coverage:hinge",
    "smith-machine-romanian-deadlift",
  );
  assert.equal(
    conservativeSmith.scoreComponents.recoveryCost
      - standardSmith.scoreComponents.recoveryCost,
    -8,
  );
  assert.deepEqual(
    conservative.ranking.requirements.map((requirement) => [
      requirement.requirementId,
      [...requirement.candidates.map((candidate) => candidate.exerciseId)].sort(),
    ]),
    standardRanking.requirements.map((requirement) => [
      requirement.requirementId,
      [...requirement.candidates.map((candidate) => candidate.exerciseId)].sort(),
    ]),
  );
});

test("presentation-only canonical names do not alter ranking identity", () => {
  const { planning } = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const baselineCatalog = structuredClone(
    PLANNER_EXERCISE_CATALOG_V1,
  ) as ExerciseCatalogBundleV1;
  const baseline = compile(planning, baselineCatalog).ranking;
  const presentationCatalog = structuredClone(
    baselineCatalog,
  ) as ExerciseCatalogBundleV1;
  exercise(presentationCatalog, "goblet-squat").canonicalName =
    "Presentation Only Squat";
  assert.equal(
    digestExerciseCatalog(presentationCatalog),
    baselineCatalog.catalogDigest,
  );
  assert.deepEqual(validateExerciseCatalogBundleV1(presentationCatalog), []);
  const altered = compile(planning, presentationCatalog).ranking;
  assert.deepEqual(altered, baseline);
});

test("runtime rejects re-signed score and reason contradictions", () => {
  const baseline = structuredClone(
    CANDIDATE_RANKING_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  const scoreTamper = resignRanking(baseline, (value) => {
    const candidate = value.requirements[0].candidates[0];
    candidate.scoreComponents.goalFit += 1;
    candidate.totalScore += 1;
  });
  assert.ok(
    validateCandidateRankingV1(scoreTamper).some(
      (error) => error.includes("scoreComponents.goalFit must equal"),
    ),
  );

  const reasonTamper = resignRanking(baseline, (value) => {
    value.requirements[0].candidates[0].reasonCodes[0] =
      "PLAN_STYLE_NEUTRAL";
  });
  assert.ok(
    validateCandidateRankingV1(reasonTamper).some(
      (error) => error.includes("must govern goalFit"),
    ),
  );
});

test("runtime rejects digest and canonical-order tampering", () => {
  const baseline = structuredClone(
    CANDIDATE_RANKING_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  );
  baseline.rankingDigest = "0".repeat(64);
  assert.ok(
    validateCandidateRankingV1(baseline).some(
      (error) => error.includes("semantic ranking projection"),
    ),
  );

  const reordered = resignRanking(
    CANDIDATE_RANKING_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
    (value) => {
      const requirement = value.requirements.find(
        (entry) => entry.candidates.length > 1,
      );
      assert.ok(requirement);
      requirement.candidates.reverse();
    },
  );
  assert.ok(
    validateCandidateRankingV1(reordered).some(
      (error) => error.includes("canonical ranking order"),
    ),
  );
});

test("runtime rejects duplicate issues even when their order is canonical", () => {
  const inputs = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const planning = structuredClone(inputs.planning) as unknown as
    Record<string, unknown>;
  planning.contractVersion = "forged";
  const invalid = compileCandidateRankingV1(
    planning,
    inputs.catalog,
    inputs.coverage,
  );
  const duplicated = resignRanking(invalid, (value) => {
    value.issues.push(structuredClone(value.issues[0]));
  });
  assert.ok(
    validateCandidateRankingV1(duplicated).some(
      (error) => error === "$.issues must be unique.",
    ),
  );
});

test("input-bound validation rejects re-signed candidate omission and injection", () => {
  const inputs = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const baseline = compileCandidateRankingV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
  );
  const omitted = resignRanking(baseline, (value) => {
    const requirement = value.requirements.find(
      (entry) => entry.candidates.length > 1,
    );
    assert.ok(requirement);
    requirement.candidates.pop();
  });
  assert.deepEqual(validateCandidateRankingV1(omitted), []);
  assert.ok(
    validateCandidateRankingAgainstInputsV1(
      omitted,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
    ).some((error) => error.includes("does not match recompilation")),
  );

  const injected = resignRanking(baseline, (value) => {
    const requirement = value.requirements.find(
      (entry) => entry.requirementId === "coverage:horizontal_pull",
    );
    assert.ok(requirement);
    const template = structuredClone(requirement.candidates[0]);
    template.exerciseId = "seated-cable-row";
    template.curatedRank = 1;
    requirement.candidates.push(template);
    requirement.candidates.sort(compareRankedExerciseCandidates);
  });
  assert.deepEqual(validateCandidateRankingV1(injected), []);
  assert.ok(
    validateCandidateRankingAgainstInputsV1(
      injected,
      inputs.planning,
      inputs.catalog,
      inputs.coverage,
    ).some((error) => error.includes("does not match recompilation")),
  );
});

test("coverage candidate pools remain hard boundaries despite large valid scores", () => {
  const inputs = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const ranking = compileCandidateRankingV1(
    inputs.planning,
    inputs.catalog,
    inputs.coverage,
  );
  assert.equal(ranking.status, "ready");
  for (const requirement of ranking.requirements) {
    const coverageRequirement = inputs.coverage.requirements.find(
      (entry) => entry.id === requirement.requirementId,
    );
    assert.ok(coverageRequirement);
    const compatibleIds = new Set(coverageRequirement.compatibleExerciseIds);
    assert.ok(
      requirement.candidates.every(
        (candidate) => compatibleIds.has(candidate.exerciseId),
      ),
    );
  }
  assert.equal(
    ranking.requirements.some((requirement) =>
      requirement.candidates.some(
        (candidate) => candidate.exerciseId === "leg-press",
      )),
    false,
  );
});

test("non-ready coverage returns a valid non-rankable terminal without candidates", () => {
  for (const fixtureId of [
    "bodyweight-travel-4day-general-fitness",
    "cardio-priority-4day-hybrid",
    "no-overhead-3day-substitution",
    "ambiguous-warning-blocked",
    "pullup-priority-no-pull-equipment",
  ] as const) {
    const { planning, catalog, coverage } =
      createCandidateRankingFixtureInputs(fixtureId);
    assert.notEqual(coverage.status, "ready");
    const result = compileCandidateRankingV1(planning, catalog, coverage);
    assert.equal(result.status, "not_rankable", fixtureId);
    assert.deepEqual(result.requirements, [], fixtureId);
    assert.deepEqual(
      result.issues.map((entry) => entry.code),
      ["COVERAGE_NOT_READY"],
      fixtureId,
    );
    assert.equal(
      validateCandidateRankingV1WithReceipt(result).valid,
      true,
      fixtureId,
    );
  }
});

test("malformed transports fail closed through the public receipt without throwing", () => {
  const baseline = structuredClone(
    CANDIDATE_RANKING_FIXTURES[
      "beginner-home-3day-general-strength"
    ],
  ) as unknown as Record<string, unknown>;
  const cases: Array<{
    name: string;
    mutate: (value: Record<string, unknown>) => void;
  }> = [
    {
      name: "missing reasonCodes",
      mutate(value) {
        const requirements = value.requirements as Array<Record<string, unknown>>;
        const candidates = requirements[0].candidates as Array<Record<string, unknown>>;
        delete candidates[0].reasonCodes;
      },
    },
    {
      name: "null candidates",
      mutate(value) {
        const requirements = value.requirements as Array<Record<string, unknown>>;
        requirements[0].candidates = null;
      },
    },
    {
      name: "wrong score shape",
      mutate(value) {
        const requirements = value.requirements as Array<Record<string, unknown>>;
        const candidates = requirements[0].candidates as Array<Record<string, unknown>>;
        candidates[0].scoreComponents = [];
      },
    },
  ];
  for (const entry of cases) {
    const malformed = structuredClone(baseline);
    entry.mutate(malformed);
    let receipt: ReturnType<typeof validateCandidateRankingV1WithReceipt>
      | undefined;
    assert.doesNotThrow(() => {
      receipt = validateCandidateRankingV1WithReceipt(malformed);
    }, entry.name);
    assert.equal(receipt?.valid, false, entry.name);
    assert.ok((receipt?.errors.length ?? 0) > 0, entry.name);
  }
});

test("invalid planning input returns a valid invalid-input terminal", () => {
  const inputs = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const planning = structuredClone(inputs.planning) as unknown as
    Record<string, unknown>;
  planning.contractVersion = "forged";
  const result = compileCandidateRankingV1(
    planning,
    inputs.catalog,
    inputs.coverage,
  );
  assert.equal(result.status, "invalid_input");
  assert.deepEqual(result.requirements, []);
  assert.deepEqual(
    result.issues.map((entry) => entry.code),
    ["INTAKE_INVALID"],
  );
  assert.equal(validateCandidateRankingV1WithReceipt(result).valid, true);
});

test("malformed coverage status is sanitized in the compiler's invalid terminal", () => {
  const inputs = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const coverage = structuredClone(inputs.coverage) as unknown as
    Record<string, unknown>;
  coverage.status = "forged";
  const result = compileCandidateRankingV1(
    inputs.planning,
    inputs.catalog,
    coverage,
  );
  assert.equal(result.status, "invalid_input");
  assert.equal(result.input.coverageStatus, null);
  assert.deepEqual(
    result.issues.map((entry) => entry.code),
    ["COVERAGE_INVALID"],
  );
  assert.equal(validateCandidateRankingV1WithReceipt(result).valid, true);
});

test("the dedicated workflow watches the full dependency tree and runs this suite directly", () => {
  const workflow = readFileSync(
    ".github/workflows/planning-ranking-contract.yml",
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
    /node --import \.\/scripts\/register-test-aliases\.mjs --test src\/features\/curated-onboarding\/planning\/ranking\/rank\.test\.ts/,
  );
  assert.match(workflow, /docs\/curated-planning-contract\.md/);
  assert.match(workflow, /docs\/PLAYBOOK_NOTES\.md/);
});

test("fixture candidate arrays satisfy the public comparator contract", () => {
  for (const ranking of Object.values(CANDIDATE_RANKING_FIXTURES)) {
    for (const requirement of ranking.requirements) {
      const sorted: RankedExerciseCandidateV1[] = [
        ...requirement.candidates,
      ].sort(compareRankedExerciseCandidates);
      assert.deepEqual(requirement.candidates, sorted);
    }
  }
});

test("coverage fixtures remain the only source of candidate eligibility", () => {
  const inputs = createCandidateRankingFixtureInputs(
    "beginner-home-3day-general-strength",
  );
  const forgedCoverage = structuredClone(
    inputs.coverage,
  ) as CoverageCompilationV1;
  forgedCoverage.requirements[0].compatibleExerciseIds.push("leg-press");
  const result = compileCandidateRankingV1(
    inputs.planning,
    inputs.catalog,
    forgedCoverage,
  );
  assert.equal(result.status, "invalid_input");
  assert.deepEqual(
    result.issues.map((entry) => entry.code),
    ["COVERAGE_INVALID"],
  );
});
