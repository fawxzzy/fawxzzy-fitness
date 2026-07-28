import {
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  EQUIPMENT_IDS,
  type EquipmentId,
  type ExerciseCatalogBundleV1,
  type ExperienceLevel,
  type MovementPattern,
  type RestrictionCode,
} from "../catalog/contract.ts";
import {
  resolveCatalogCandidates,
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  CARDIO_COVERAGE_POLICY,
  COVERAGE_COMPILER_VERSION,
  COVERAGE_ISSUE_POLICY,
  COVERAGE_POLICY_VERSION,
  COVERAGE_SCHEMA_VERSION,
  MOVEMENT_SKILL_COVERAGE_POLICY,
  PRIMARY_GOAL_COVERAGE_POLICY,
  SECONDARY_GOAL_COVERAGE_POLICY,
  TARGET_AREA_COVERAGE_POLICY,
  digestCoverageCompilation,
  validateCoverageCompilationV1,
  type CoverageCompilationV1,
  type CoverageHardConstraintsV1,
  type CoverageInputIdentityV1,
  type CoverageIssueCode,
  type CoverageIssueV1,
  type CoverageRequirementSourceV1,
  type CoverageRequirementV1,
  type CoverageScheduleV1,
  type CoverageSourceKind,
  type CoverageStatus,
} from "./contract.ts";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

type CoveragePolicy = readonly (readonly MovementPattern[])[];
type RequirementAccumulator = {
  anyOfMovementPatterns: MovementPattern[];
  minimumWeeklyOccurrences: number;
  sources: CoverageRequirementSourceV1[];
};

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStrings<T extends string>(values: Iterable<T>) {
  return [...new Set(values)].sort(canonicalCompare);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function safeDigest(value: unknown) {
  return typeof value === "string" && DIGEST_PATTERN.test(value) ? value : null;
}

function readInputIdentity(
  planningValue: unknown,
  catalogValue: unknown,
): CoverageInputIdentityV1 {
  const planning = asRecord(planningValue);
  const source = asRecord(planning?.source);
  const catalog = asRecord(catalogValue);
  return {
    planningContractVersion: safeString(planning?.contractVersion),
    planningNormalizerVersion: safeString(source?.normalizerVersion),
    planningGenerationDigest: safeDigest(planning?.generationProjectionDigest),
    catalogSchemaVersion: safeString(catalog?.schemaVersion),
    catalogVersion: safeString(catalog?.catalogVersion),
    catalogDigest: safeDigest(catalog?.catalogDigest),
  };
}

function issue(code: CoverageIssueCode, values: Iterable<string> = []): CoverageIssueV1 {
  const policy = COVERAGE_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function issueKey(value: CoverageIssueV1) {
  return [value.code, value.values.join("|")].join("|");
}

function sourceKey(source: CoverageRequirementSourceV1) {
  return [
    source.kind,
    String(source.rank ?? Number.MAX_SAFE_INTEGER).padStart(16, "0"),
    source.value,
  ].join("|");
}

function finalize(
  status: CoverageStatus,
  input: CoverageInputIdentityV1,
  options: {
    schedule?: CoverageScheduleV1 | null;
    hardConstraints?: CoverageHardConstraintsV1 | null;
    requirements?: CoverageRequirementV1[];
    issues?: CoverageIssueV1[];
  } = {},
): CoverageCompilationV1 {
  const withoutDigest: Omit<CoverageCompilationV1, "coverageDigest"> = {
    schemaVersion: COVERAGE_SCHEMA_VERSION,
    compilerVersion: COVERAGE_COMPILER_VERSION,
    policyVersion: COVERAGE_POLICY_VERSION,
    input,
    status,
    schedule: options.schedule ?? null,
    hardConstraints: options.hardConstraints ?? null,
    requirements: [...(options.requirements ?? [])].sort(
      (left, right) => canonicalCompare(left.id, right.id),
    ),
    issues: [...(options.issues ?? [])].sort(
      (left, right) => canonicalCompare(issueKey(left), issueKey(right)),
    ),
  };
  return {
    ...withoutDigest,
    coverageDigest: digestCoverageCompilation(withoutDigest),
  };
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildExerciseLookup(catalog: ExerciseCatalogBundleV1) {
  const lookup = new Map<string, string>();
  for (const exercise of catalog.exercises) {
    lookup.set(normalizeLookupValue(exercise.id), exercise.id);
    for (const alias of exercise.aliases) {
      lookup.set(normalizeLookupValue(alias), exercise.id);
    }
  }
  return lookup;
}

function resolveHardExerciseNames(
  names: readonly string[],
  lookup: Map<string, string>,
) {
  const resolved = new Set<string>();
  const unresolved: string[] = [];
  for (const name of names) {
    const exerciseId = lookup.get(normalizeLookupValue(name));
    if (exerciseId) {
      resolved.add(exerciseId);
    } else {
      unresolved.push(name);
    }
  }
  return {
    resolved: canonicalStrings(resolved),
    unresolved: canonicalStrings(unresolved),
  };
}

function hasOwn<T extends object>(value: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function addPolicy(
  requirements: Map<string, RequirementAccumulator>,
  policy: CoveragePolicy,
  source: CoverageRequirementSourceV1,
  minimumWeeklyOccurrences = 1,
) {
  for (const rawPatterns of policy) {
    const anyOfMovementPatterns = canonicalStrings(rawPatterns);
    const key = anyOfMovementPatterns.join("+");
    const current = requirements.get(key) ?? {
      anyOfMovementPatterns,
      minimumWeeklyOccurrences: 1,
      sources: [],
    };
    current.minimumWeeklyOccurrences = Math.max(
      current.minimumWeeklyOccurrences,
      minimumWeeklyOccurrences,
    );
    if (!current.sources.some((entry) => sourceKey(entry) === sourceKey(source))) {
      current.sources.push(source);
      current.sources.sort((left, right) => canonicalCompare(sourceKey(left), sourceKey(right)));
    }
    requirements.set(key, current);
  }
}

function addMappedValue(
  requirements: Map<string, RequirementAccumulator>,
  issues: CoverageIssueV1[],
  value: string,
  rank: number | null,
  sourceKind: CoverageSourceKind,
  policyMap: Record<string, CoveragePolicy | null>,
  unmappedCode: CoverageIssueCode,
) {
  if (!hasOwn(policyMap, value)) {
    issues.push(issue(unmappedCode, [value]));
    return;
  }
  const policy = policyMap[value];
  if (policy) {
    addPolicy(requirements, policy, {
      kind: sourceKind,
      value,
      rank,
    });
  }
}

function compileRequirementCandidates(
  catalog: ExerciseCatalogBundleV1,
  accumulator: RequirementAccumulator,
  queryBase: {
    availableEquipment: EquipmentId[];
    avoidedEquipment: EquipmentId[];
    restrictionCodes: RestrictionCode[];
    experience: ExperienceLevel;
  },
  hardExcludedIds: Set<string>,
) {
  const compatibleExerciseIds = new Set<string>();
  const rejectionReasons = new Set<string>();
  const invalidReasons = new Set<string>();
  for (const movementPattern of accumulator.anyOfMovementPatterns) {
    const result = resolveCatalogCandidates(catalog, {
      movementPatterns: [movementPattern],
      ...queryBase,
    });
    if (result.status === "available") {
      for (const exerciseId of result.compatibleExerciseIds) {
        if (!hardExcludedIds.has(exerciseId)) {
          compatibleExerciseIds.add(exerciseId);
        } else {
          rejectionReasons.add("EXERCISE_EXCLUDED");
        }
      }
    } else if (result.status === "unavailable") {
      for (const reason of result.reasonCodes) rejectionReasons.add(reason);
    } else {
      for (const reason of result.reasonCodes) invalidReasons.add(reason);
      for (const error of result.validationErrors) invalidReasons.add(error);
    }
  }
  return {
    requirement: {
      id: `coverage:${accumulator.anyOfMovementPatterns.join("+")}`,
      anyOfMovementPatterns: [...accumulator.anyOfMovementPatterns],
      minimumWeeklyOccurrences: accumulator.minimumWeeklyOccurrences,
      sources: [...accumulator.sources],
      compatibleExerciseIds: canonicalStrings(compatibleExerciseIds),
    } satisfies CoverageRequirementV1,
    rejectionReasons: canonicalStrings(rejectionReasons),
    invalidReasons: canonicalStrings(invalidReasons),
  };
}

export function compilePlanningCoverageV1(
  planningValue: unknown,
  catalogValue: unknown,
): CoverageCompilationV1 {
  const input = readInputIdentity(planningValue, catalogValue);
  const planningErrors = validateNormalizedPlanningIntakeV1(planningValue);
  const catalogErrors = validateExerciseCatalogBundleV1(catalogValue);
  const invalidIssues: CoverageIssueV1[] = [];
  if (planningErrors.length > 0) {
    invalidIssues.push(issue("INTAKE_INVALID", planningErrors));
  }
  if (catalogErrors.length > 0) {
    invalidIssues.push(issue("CATALOG_INVALID", catalogErrors));
  }
  if (invalidIssues.length > 0) {
    return finalize("invalid_input", input, { issues: invalidIssues });
  }

  const planning = planningValue as NormalizedPlanningIntakeV1;
  const catalog = catalogValue as ExerciseCatalogBundleV1;
  const blockingCodes = canonicalStrings(planning.constraintClasses.blockingIssueCodes);
  const blockingIssues: CoverageIssueV1[] = [];
  if (blockingCodes.length > 0) {
    blockingIssues.push(issue("PLANNING_BLOCKED", blockingCodes));
  }
  if (planning.safety.status === "blocked" || planning.safety.status === "ambiguous") {
    blockingIssues.push(issue("SAFETY_BLOCKED", [
      planning.safety.status,
      ...planning.safety.warningFlags,
      ...planning.safety.unresolvedItems.map((entry) => entry.code),
    ]));
  }
  if (blockingIssues.length > 0) {
    return finalize("blocked", input, { issues: blockingIssues });
  }

  const unsupportedEquipment = canonicalStrings([
    ...planning.environment.equipmentAvailable.map((id) => `available:${id}`),
    ...planning.environment.equipmentAvoided.map((id) => `avoided:${id}`),
  ].filter((entry) => {
    const id = entry.slice(entry.indexOf(":") + 1);
    return !EQUIPMENT_IDS.includes(id as EquipmentId);
  }));
  if (unsupportedEquipment.length > 0) {
    return finalize("invalid_input", input, {
      issues: [issue("UNSUPPORTED_EQUIPMENT_ID", unsupportedEquipment)],
    });
  }

  const clarificationIssues: CoverageIssueV1[] = [];
  if (planning.environment.equipmentAvailable.length === 0) {
    clarificationIssues.push(issue("EQUIPMENT_REQUIRED"));
  }
  if (
    planning.schedule.dayConstraint === "unknown"
    || planning.schedule.requestedDaysPerWeek === null
  ) {
    clarificationIssues.push(issue("SCHEDULE_REQUIRED"));
  }
  if (
    planning.schedule.sessionMinutes.target === null
    || planning.schedule.sessionMinutes.hardMaximum === null
  ) {
    clarificationIssues.push(issue("SESSION_DURATION_REQUIRED"));
  }
  if (planning.trainingBackground.experience === null) {
    clarificationIssues.push(issue("EXPERIENCE_REQUIRED"));
  }

  const exerciseLookup = buildExerciseLookup(catalog);
  const excluded = resolveHardExerciseNames(
    planning.safety.excludedExerciseNames,
    exerciseLookup,
  );
  const uncomfortable = resolveHardExerciseNames(
    planning.safety.uncomfortableExerciseNames,
    exerciseLookup,
  );
  if (excluded.unresolved.length > 0) {
    clarificationIssues.push(issue(
      "UNRESOLVED_EXCLUDED_EXERCISE",
      excluded.unresolved,
    ));
  }
  if (uncomfortable.unresolved.length > 0) {
    clarificationIssues.push(issue(
      "UNRESOLVED_UNCOMFORTABLE_EXERCISE",
      uncomfortable.unresolved,
    ));
  }
  if (planning.preferences.requiredExerciseNames.length > 0) {
    clarificationIssues.push(issue(
      "REQUIRED_EXERCISE_SEMANTICS_UNAVAILABLE",
      planning.preferences.requiredExerciseNames,
    ));
  }

  const requirementAccumulators = new Map<string, RequirementAccumulator>();
  const primaryGoal = planning.goals.primary;
  if (
    primaryGoal === null
    || !hasOwn(PRIMARY_GOAL_COVERAGE_POLICY, primaryGoal)
  ) {
    clarificationIssues.push(issue("UNMAPPED_PRIMARY_GOAL", [
      primaryGoal ?? "(null)",
    ]));
  } else {
    addPolicy(
      requirementAccumulators,
      PRIMARY_GOAL_COVERAGE_POLICY[primaryGoal],
      { kind: "primary_goal", value: primaryGoal, rank: null },
    );
  }

  for (const secondary of planning.goals.secondary) {
    addMappedValue(
      requirementAccumulators,
      clarificationIssues,
      secondary.value,
      secondary.rank,
      "secondary_goal",
      SECONDARY_GOAL_COVERAGE_POLICY,
      "UNMAPPED_SECONDARY_GOAL",
    );
  }
  for (const targetArea of planning.goals.targetAreas) {
    addMappedValue(
      requirementAccumulators,
      clarificationIssues,
      targetArea.value,
      targetArea.rank,
      "target_area",
      TARGET_AREA_COVERAGE_POLICY,
      "UNMAPPED_TARGET_AREA",
    );
  }
  for (const movementSkill of planning.goals.movementSkills) {
    addMappedValue(
      requirementAccumulators,
      clarificationIssues,
      movementSkill.value,
      movementSkill.rank,
      "movement_skill",
      MOVEMENT_SKILL_COVERAGE_POLICY,
      "UNMAPPED_MOVEMENT_SKILL",
    );
  }
  const cardioPolicy = CARDIO_COVERAGE_POLICY[planning.preferences.cardio.priority];
  if (cardioPolicy) {
    addPolicy(
      requirementAccumulators,
      cardioPolicy.selectors,
      {
        kind: "cardio",
        value: planning.preferences.cardio.priority,
        rank: null,
      },
      cardioPolicy.minimumWeeklyOccurrences,
    );
  }
  if (clarificationIssues.length > 0) {
    return finalize("needs_clarification", input, {
      issues: clarificationIssues,
    });
  }

  const schedule: CoverageScheduleV1 = {
    requestedDaysPerWeek: planning.schedule.requestedDaysPerWeek as
      CoverageScheduleV1["requestedDaysPerWeek"],
    weekdays: [...planning.schedule.weekdays],
    dayConstraint: planning.schedule.dayConstraint as CoverageScheduleV1["dayConstraint"],
    flexibility: planning.schedule.flexibility as CoverageScheduleV1["flexibility"],
    sessionMinutes: {
      target: planning.schedule.sessionMinutes.target as number,
      hardMaximum: planning.schedule.sessionMinutes.hardMaximum as number,
    },
  };
  const restrictionCodes = canonicalStrings(
    planning.safety.movementRestrictions.map((entry) => entry.code),
  ) as RestrictionCode[];
  const hardConstraints: CoverageHardConstraintsV1 = {
    availableEquipment: [...planning.environment.equipmentAvailable] as EquipmentId[],
    avoidedEquipment: [...planning.environment.equipmentAvoided] as EquipmentId[],
    maximumDumbbellLoadKg:
      planning.environment.equipmentLimits.maximumDumbbellLoadKg,
    restrictionCodes,
    excludedExerciseIds: excluded.resolved,
    uncomfortableExerciseIds: uncomfortable.resolved,
  };
  const hardExcludedIds = new Set([
    ...hardConstraints.excludedExerciseIds,
    ...hardConstraints.uncomfortableExerciseIds,
  ]);
  const queryBase = {
    availableEquipment: hardConstraints.availableEquipment,
    avoidedEquipment: hardConstraints.avoidedEquipment,
    restrictionCodes: hardConstraints.restrictionCodes,
    experience: planning.trainingBackground.experience as ExperienceLevel,
  };
  const requirements: CoverageRequirementV1[] = [];
  const infeasibilityIssues: CoverageIssueV1[] = [];
  const candidateResolutionErrors = new Set<string>();
  for (const accumulator of requirementAccumulators.values()) {
    const compiled = compileRequirementCandidates(
      catalog,
      accumulator,
      queryBase,
      hardExcludedIds,
    );
    requirements.push(compiled.requirement);
    for (const error of compiled.invalidReasons) {
      candidateResolutionErrors.add(error);
    }
    if (compiled.requirement.compatibleExerciseIds.length === 0) {
      infeasibilityIssues.push(issue("REQUIRED_COVERAGE_UNAVAILABLE", [
        compiled.requirement.id,
        ...compiled.rejectionReasons,
      ]));
    }
    if (
      compiled.requirement.minimumWeeklyOccurrences
      > schedule.requestedDaysPerWeek
    ) {
      infeasibilityIssues.push(issue("WEEKLY_FREQUENCY_UNAVAILABLE", [
        compiled.requirement.id,
        `required:${compiled.requirement.minimumWeeklyOccurrences}`,
        `available:${schedule.requestedDaysPerWeek}`,
      ]));
    }
  }
  if (candidateResolutionErrors.size > 0) {
    return finalize("invalid_input", input, {
      issues: [issue(
        "CANDIDATE_RESOLUTION_INVALID",
        candidateResolutionErrors,
      )],
    });
  }

  return finalize(
    infeasibilityIssues.length > 0 ? "infeasible" : "ready",
    input,
    {
      schedule,
      hardConstraints,
      requirements,
      issues: infeasibilityIssues,
    },
  );
}

export function validateCoverageCompilationAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
) {
  const errors = validateCoverageCompilationV1(value);
  if (errors.length > 0) return errors;
  const supplied = value as CoverageCompilationV1;
  const expected = compilePlanningCoverageV1(planningValue, catalogValue);
  if (supplied.coverageDigest !== expected.coverageDigest) {
    errors.push(
      "$.coverageDigest does not match recompilation from the supplied planning intake and catalog.",
    );
  }
  return errors;
}
