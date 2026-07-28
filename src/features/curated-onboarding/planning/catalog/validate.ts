import { canonicalizeJson, digestCanonicalJson } from "../canonical.ts";
import {
  BEGINNER_SUITABILITY,
  CANONICAL_EQUIPMENT_KIND_POLICY,
  CANONICAL_PRESCRIPTION_CLASS_POLICY,
  CANONICAL_RESTRICTION_DEMAND_POLICY,
  DEMAND_TAGS,
  EQUIPMENT_IDS,
  EQUIPMENT_KINDS,
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  EXERCISE_MODALITIES,
  EXERCISE_ROLES,
  EXERCISE_STATUSES,
  EXPERIENCE_LEVELS,
  GOAL_CODES,
  IMPACT_LEVELS,
  MEASUREMENT_TYPES,
  MOVEMENT_PATTERNS,
  MUSCLE_CONTRIBUTIONS,
  MUSCLE_GROUPS,
  PLAN_STYLE_CODES,
  PRESCRIPTION_CLASS_IDS,
  PRESCRIPTION_POLICY_VERSION,
  PROGRESSION_MODES,
  RESTRICTION_CODES,
  RESTRICTION_TAXONOMY_VERSION,
  SAFETY_REVIEW_STATUSES,
  type CatalogCandidateQueryV1,
  type CatalogCandidateRejectionCode,
  type CatalogCandidateResolution,
  type ExerciseCatalogBundleV1,
  type ExerciseDefinitionV1,
} from "./contract.ts";

const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

const ROOT_KEYS = [
  "schemaVersion",
  "catalogVersion",
  "restrictionTaxonomyVersion",
  "prescriptionPolicyVersion",
  "equipment",
  "restrictions",
  "prescriptionClasses",
  "exercises",
  "substitutionRules",
  "catalogDigest",
] as const;
const EQUIPMENT_KEYS = ["id", "kind", "aliases"] as const;
const RESTRICTION_KEYS = ["code", "deniedDemandTags"] as const;
const PRESCRIPTION_KEYS = [
  "id",
  "measurementType",
  "supportedProgressionModes",
  "targetBounds",
  "startingLoadPolicy",
] as const;
const TARGET_BOUNDS_KEYS = ["unit", "minimum", "maximum"] as const;
const EXERCISE_KEYS = [
  "id",
  "status",
  "canonicalName",
  "aliases",
  "classification",
  "environment",
  "suitability",
  "safety",
  "cost",
  "prescriptionSupport",
  "selection",
  "substitution",
] as const;
const CLASSIFICATION_KEYS = [
  "modality",
  "roles",
  "movementPatterns",
  "muscleContributions",
  "unilateral",
  "closedChain",
] as const;
const MUSCLE_CONTRIBUTION_KEYS = ["muscleGroup", "contribution"] as const;
const ENVIRONMENT_KEYS = [
  "requiredAllEquipment",
  "requiredAnyEquipmentGroups",
  "optionalEquipment",
] as const;
const SUITABILITY_KEYS = ["minimumExperience", "beginnerSuitability"] as const;
const SAFETY_KEYS = [
  "reviewStatus",
  "demandTags",
  "excludedByRestrictionTags",
  "requiresClearanceTags",
  "impactLevel",
  "balanceDemand",
  "systemicFatigue",
] as const;
const COST_KEYS = ["setupSeconds", "estimatedActiveSecondsPerSet", "transitionSeconds"] as const;
const PRESCRIPTION_SUPPORT_KEYS = [
  "prescriptionClassIds",
  "supportedProgressionModes",
  "startingLoadPolicy",
] as const;
const SELECTION_KEYS = ["goalTiers", "styleTags", "timeEfficiencyTier", "curatedRank"] as const;
const SUBSTITUTION_KEYS = ["equivalenceClassIds"] as const;
const SUBSTITUTION_RULE_KEYS = [
  "id",
  "equivalenceClassId",
  "sourceExerciseId",
  "candidateExerciseIds",
  "reasonCode",
] as const;
const QUERY_KEYS = [
  "movementPatterns",
  "availableEquipment",
  "avoidedEquipment",
  "restrictionCodes",
  "experience",
] as const;

type JsonRecord = Record<string, unknown>;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function asRecord(value: unknown, path: string, errors: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  return value as JsonRecord;
}

function validateExactKeys(
  record: JsonRecord,
  requiredKeys: readonly string[],
  path: string,
  errors: string[],
) {
  const expected = [...requiredKeys].sort(canonicalCompare);
  const actual = Object.keys(record).sort(canonicalCompare);
  if (canonicalizeJson(actual) !== canonicalizeJson(expected)) {
    errors.push(`${path} must contain exactly: ${expected.join(", ")}.`);
  }
}

function validateLiteral(
  value: unknown,
  expected: string,
  path: string,
  errors: string[],
) {
  if (value !== expected) {
    errors.push(`${path} must equal ${expected}.`);
  }
}

function validateEnum(
  value: unknown,
  allowed: readonly string[],
  path: string,
  errors: string[],
) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${path} must be one of: ${allowed.join(", ")}.`);
    return null;
  }
  return value;
}

function validateString(
  value: unknown,
  path: string,
  errors: string[],
  options: { identifier?: boolean; lowercase?: boolean } = {},
) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${path} must be a non-empty string.`);
    return null;
  }
  if (value !== value.trim()) {
    errors.push(`${path} must not contain leading or trailing whitespace.`);
  }
  if (options.lowercase && value !== value.toLowerCase()) {
    errors.push(`${path} must use lowercase canonical text.`);
  }
  if (options.identifier && !IDENTIFIER_PATTERN.test(value)) {
    errors.push(`${path} must be a kebab-case identifier.`);
  }
  return value;
}

function validateBoolean(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "boolean") {
    errors.push(`${path} must be a boolean.`);
  }
}

function validateInteger(
  value: unknown,
  path: string,
  errors: string[],
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    errors.push(`${path} must be an integer from ${minimum} to ${maximum}.`);
  }
}

function validatePositiveNumber(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push(`${path} must be a finite positive number.`);
  }
}

function validateCanonicalStringArray(
  value: unknown,
  path: string,
  errors: string[],
  options: {
    allowed?: readonly string[];
    identifier?: boolean;
    lowercase?: boolean;
    minimum?: number;
  } = {},
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }
  if (value.length < (options.minimum ?? 0)) {
    errors.push(`${path} must contain at least ${options.minimum ?? 0} item(s).`);
  }

  const validated: string[] = [];
  value.forEach((entry, index) => {
    const currentPath = `${path}[${index}]`;
    const stringValue = validateString(entry, currentPath, errors, options);
    if (stringValue === null) {
      return;
    }
    if (options.allowed && !options.allowed.includes(stringValue)) {
      errors.push(`${currentPath} is unsupported.`);
    }
    validated.push(stringValue);
  });

  if (new Set(validated).size !== validated.length) {
    errors.push(`${path} must contain unique values.`);
  }
  if (canonicalizeJson(validated) !== canonicalizeJson([...validated].sort(canonicalCompare))) {
    errors.push(`${path} must use canonical lexical ordering.`);
  }
  return validated;
}

function validateExactOrderedValues(
  actual: string[],
  expected: readonly string[],
  path: string,
  errors: string[],
) {
  if (canonicalizeJson(actual) !== canonicalizeJson(expected)) {
    errors.push(`${path} must equal the frozen versioned set in exact order.`);
  }
}

function validateRecordArray(
  value: unknown,
  path: string,
  errors: string[],
  minimum = 0,
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }
  if (value.length < minimum) {
    errors.push(`${path} must contain at least ${minimum} item(s).`);
  }
  return value.map((entry, index) => asRecord(entry, `${path}[${index}]`, errors));
}

function validateEquipment(value: unknown, errors: string[]) {
  const records = validateRecordArray(value, "$.equipment", errors, 1);
  const ids: string[] = [];
  records.forEach((record, index) => {
    if (!record) return;
    const path = `$.equipment[${index}]`;
    validateExactKeys(record, EQUIPMENT_KEYS, path, errors);
    const id = validateEnum(record.id, EQUIPMENT_IDS, `${path}.id`, errors);
    const kind = validateEnum(record.kind, EQUIPMENT_KINDS, `${path}.kind`, errors);
    validateCanonicalStringArray(record.aliases, `${path}.aliases`, errors, {
      lowercase: true,
    });
    if (id) {
      ids.push(id);
      if (kind && kind !== CANONICAL_EQUIPMENT_KIND_POLICY[id as keyof typeof CANONICAL_EQUIPMENT_KIND_POLICY]) {
        errors.push(`${path}.kind does not match the frozen equipment policy.`);
      }
    }
  });
  if (new Set(ids).size !== ids.length) {
    errors.push("$.equipment ids must be unique.");
  }
  validateExactOrderedValues(ids, EQUIPMENT_IDS, "$.equipment ids", errors);
}

function validateRestrictions(value: unknown, errors: string[]) {
  const records = validateRecordArray(value, "$.restrictions", errors, 1);
  const codes: string[] = [];
  records.forEach((record, index) => {
    if (!record) return;
    const path = `$.restrictions[${index}]`;
    validateExactKeys(record, RESTRICTION_KEYS, path, errors);
    const code = validateEnum(record.code, RESTRICTION_CODES, `${path}.code`, errors);
    const demandTags = validateCanonicalStringArray(
      record.deniedDemandTags,
      `${path}.deniedDemandTags`,
      errors,
      { allowed: DEMAND_TAGS, minimum: 1 },
    );
    if (code) {
      codes.push(code);
      const expected = CANONICAL_RESTRICTION_DEMAND_POLICY[
        code as keyof typeof CANONICAL_RESTRICTION_DEMAND_POLICY
      ];
      if (canonicalizeJson(demandTags) !== canonicalizeJson(expected)) {
        errors.push(`${path}.deniedDemandTags does not match the frozen restriction policy.`);
      }
    }
  });
  if (new Set(codes).size !== codes.length) {
    errors.push("$.restrictions codes must be unique.");
  }
  validateExactOrderedValues(codes, RESTRICTION_CODES, "$.restrictions codes", errors);
}

function validateTargetBounds(value: unknown, path: string, errors: string[]) {
  if (value === null) return;
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, TARGET_BOUNDS_KEYS, path, errors);
  validateEnum(record.unit, ["reps", "seconds", "minutes"], `${path}.unit`, errors);
  validatePositiveNumber(record.minimum, `${path}.minimum`, errors);
  validatePositiveNumber(record.maximum, `${path}.maximum`, errors);
  if (
    typeof record.minimum === "number"
    && typeof record.maximum === "number"
    && record.minimum > record.maximum
  ) {
    errors.push(`${path}.minimum must not exceed maximum.`);
  }
}

function validatePrescriptionClasses(value: unknown, errors: string[]) {
  const records = validateRecordArray(value, "$.prescriptionClasses", errors, 1);
  const ids: string[] = [];
  records.forEach((record, index) => {
    if (!record) return;
    const path = `$.prescriptionClasses[${index}]`;
    validateExactKeys(record, PRESCRIPTION_KEYS, path, errors);
    const id = validateEnum(record.id, PRESCRIPTION_CLASS_IDS, `${path}.id`, errors);
    validateEnum(record.measurementType, MEASUREMENT_TYPES, `${path}.measurementType`, errors);
    validateCanonicalStringArray(
      record.supportedProgressionModes,
      `${path}.supportedProgressionModes`,
      errors,
      { allowed: PROGRESSION_MODES, minimum: 1 },
    );
    validateTargetBounds(record.targetBounds, `${path}.targetBounds`, errors);
    validateLiteral(record.startingLoadPolicy, "unset", `${path}.startingLoadPolicy`, errors);
    if (id) {
      ids.push(id);
      const actualPolicy = {
        measurementType: record.measurementType,
        supportedProgressionModes: record.supportedProgressionModes,
        targetBounds: record.targetBounds,
        startingLoadPolicy: record.startingLoadPolicy,
      };
      const expectedPolicy = CANONICAL_PRESCRIPTION_CLASS_POLICY[
        id as keyof typeof CANONICAL_PRESCRIPTION_CLASS_POLICY
      ];
      if (canonicalizeJson(actualPolicy) !== canonicalizeJson(expectedPolicy)) {
        errors.push(`${path} does not match the frozen prescription-class policy.`);
      }
    }
  });
  if (new Set(ids).size !== ids.length) {
    errors.push("$.prescriptionClasses ids must be unique.");
  }
  validateExactOrderedValues(
    ids,
    PRESCRIPTION_CLASS_IDS,
    "$.prescriptionClasses ids",
    errors,
  );
}

function validateClassification(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, CLASSIFICATION_KEYS, path, errors);
  validateEnum(record.modality, EXERCISE_MODALITIES, `${path}.modality`, errors);
  validateCanonicalStringArray(record.roles, `${path}.roles`, errors, {
    allowed: EXERCISE_ROLES,
    minimum: 1,
  });
  validateCanonicalStringArray(record.movementPatterns, `${path}.movementPatterns`, errors, {
    allowed: MOVEMENT_PATTERNS,
    minimum: 1,
  });
  const contributions = validateRecordArray(
    record.muscleContributions,
    `${path}.muscleContributions`,
    errors,
    1,
  );
  const contributionKeys: string[] = [];
  let primaryCount = 0;
  contributions.forEach((entry, index) => {
    if (!entry) return;
    const entryPath = `${path}.muscleContributions[${index}]`;
    validateExactKeys(entry, MUSCLE_CONTRIBUTION_KEYS, entryPath, errors);
    const muscle = validateEnum(entry.muscleGroup, MUSCLE_GROUPS, `${entryPath}.muscleGroup`, errors);
    const contribution = validateEnum(
      entry.contribution,
      MUSCLE_CONTRIBUTIONS,
      `${entryPath}.contribution`,
      errors,
    );
    if (muscle && contribution) {
      contributionKeys.push(`${muscle}:${contribution}`);
      if (contribution === "primary") primaryCount += 1;
    }
  });
  if (new Set(contributionKeys).size !== contributionKeys.length) {
    errors.push(`${path}.muscleContributions must be unique.`);
  }
  if (
    canonicalizeJson(contributionKeys)
    !== canonicalizeJson([...contributionKeys].sort(canonicalCompare))
  ) {
    errors.push(`${path}.muscleContributions must use canonical ordering.`);
  }
  if (primaryCount === 0) {
    errors.push(`${path}.muscleContributions requires at least one primary muscle.`);
  }
  validateBoolean(record.unilateral, `${path}.unilateral`, errors);
  validateBoolean(record.closedChain, `${path}.closedChain`, errors);
}

function validateEnvironment(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, ENVIRONMENT_KEYS, path, errors);
  const requiredAll = validateCanonicalStringArray(
    record.requiredAllEquipment,
    `${path}.requiredAllEquipment`,
    errors,
    { allowed: EQUIPMENT_IDS },
  );
  const optional = validateCanonicalStringArray(
    record.optionalEquipment,
    `${path}.optionalEquipment`,
    errors,
    { allowed: EQUIPMENT_IDS },
  );
  const groups = Array.isArray(record.requiredAnyEquipmentGroups)
    ? record.requiredAnyEquipmentGroups
    : null;
  if (!groups) {
    errors.push(`${path}.requiredAnyEquipmentGroups must be an array.`);
  }
  const normalizedGroups: string[] = [];
  groups?.forEach((group, index) => {
    const values = validateCanonicalStringArray(
      group,
      `${path}.requiredAnyEquipmentGroups[${index}]`,
      errors,
      { allowed: EQUIPMENT_IDS, minimum: 1 },
    );
    normalizedGroups.push(values.join("|"));
  });
  if (new Set(normalizedGroups).size !== normalizedGroups.length) {
    errors.push(`${path}.requiredAnyEquipmentGroups must be unique.`);
  }
  if (
    canonicalizeJson(normalizedGroups)
    !== canonicalizeJson([...normalizedGroups].sort(canonicalCompare))
  ) {
    errors.push(`${path}.requiredAnyEquipmentGroups must use canonical ordering.`);
  }
  if (requiredAll.length === 0 && normalizedGroups.length === 0) {
    errors.push(`${path} must declare at least one hard equipment requirement.`);
  }

  const requiredAny = new Set(groups?.flatMap((group) => (
    Array.isArray(group) ? group.filter((item): item is string => typeof item === "string") : []
  )));
  for (const id of requiredAll) {
    if (requiredAny.has(id) || optional.includes(id)) {
      errors.push(`${path} equipment roles must be mutually disjoint.`);
    }
  }
  for (const id of optional) {
    if (requiredAny.has(id)) {
      errors.push(`${path} equipment roles must be mutually disjoint.`);
    }
  }
}

function validateSuitability(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, SUITABILITY_KEYS, path, errors);
  validateEnum(record.minimumExperience, EXPERIENCE_LEVELS, `${path}.minimumExperience`, errors);
  validateEnum(
    record.beginnerSuitability,
    BEGINNER_SUITABILITY,
    `${path}.beginnerSuitability`,
    errors,
  );
}

function validateSafety(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, SAFETY_KEYS, path, errors);
  validateEnum(record.reviewStatus, SAFETY_REVIEW_STATUSES, `${path}.reviewStatus`, errors);
  validateCanonicalStringArray(record.demandTags, `${path}.demandTags`, errors, {
    allowed: DEMAND_TAGS,
  });
  const excluded = validateCanonicalStringArray(
    record.excludedByRestrictionTags,
    `${path}.excludedByRestrictionTags`,
    errors,
    { allowed: RESTRICTION_CODES },
  );
  const clearance = validateCanonicalStringArray(
    record.requiresClearanceTags,
    `${path}.requiresClearanceTags`,
    errors,
    { allowed: RESTRICTION_CODES },
  );
  if (excluded.some((code) => clearance.includes(code))) {
    errors.push(`${path} exclusion and clearance restriction tags must be disjoint.`);
  }
  validateEnum(record.impactLevel, IMPACT_LEVELS, `${path}.impactLevel`, errors);
  validateInteger(record.balanceDemand, `${path}.balanceDemand`, errors, 1, 5);
  validateInteger(record.systemicFatigue, `${path}.systemicFatigue`, errors, 1, 5);
}

function validateCost(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, COST_KEYS, path, errors);
  validateInteger(record.setupSeconds, `${path}.setupSeconds`, errors, 0);
  validateInteger(
    record.estimatedActiveSecondsPerSet,
    `${path}.estimatedActiveSecondsPerSet`,
    errors,
    1,
  );
  validateInteger(record.transitionSeconds, `${path}.transitionSeconds`, errors, 0);
}

function validatePrescriptionSupport(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, PRESCRIPTION_SUPPORT_KEYS, path, errors);
  validateCanonicalStringArray(
    record.prescriptionClassIds,
    `${path}.prescriptionClassIds`,
    errors,
    { allowed: PRESCRIPTION_CLASS_IDS, minimum: 1 },
  );
  validateCanonicalStringArray(
    record.supportedProgressionModes,
    `${path}.supportedProgressionModes`,
    errors,
    { allowed: PROGRESSION_MODES, minimum: 1 },
  );
  validateLiteral(record.startingLoadPolicy, "unset", `${path}.startingLoadPolicy`, errors);
}

function validateSelection(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, SELECTION_KEYS, path, errors);
  const goalTiers = asRecord(record.goalTiers, `${path}.goalTiers`, errors);
  if (goalTiers) {
    validateExactKeys(goalTiers, GOAL_CODES, `${path}.goalTiers`, errors);
    GOAL_CODES.forEach((goal) => {
      validateInteger(goalTiers[goal], `${path}.goalTiers.${goal}`, errors, 1, 5);
    });
  }
  validateCanonicalStringArray(record.styleTags, `${path}.styleTags`, errors, {
    allowed: PLAN_STYLE_CODES,
    minimum: 1,
  });
  validateInteger(record.timeEfficiencyTier, `${path}.timeEfficiencyTier`, errors, 1, 5);
  validateInteger(record.curatedRank, `${path}.curatedRank`, errors, 1);
}

function validateExerciseSubstitution(value: unknown, path: string, errors: string[]) {
  const record = asRecord(value, path, errors);
  if (!record) return;
  validateExactKeys(record, SUBSTITUTION_KEYS, path, errors);
  validateCanonicalStringArray(
    record.equivalenceClassIds,
    `${path}.equivalenceClassIds`,
    errors,
    { identifier: true, minimum: 1 },
  );
}

function validateExercises(value: unknown, errors: string[]) {
  const records = validateRecordArray(value, "$.exercises", errors, 1);
  const ids: string[] = [];
  records.forEach((record, index) => {
    if (!record) return;
    const path = `$.exercises[${index}]`;
    validateExactKeys(record, EXERCISE_KEYS, path, errors);
    const id = validateString(record.id, `${path}.id`, errors, { identifier: true });
    validateEnum(record.status, EXERCISE_STATUSES, `${path}.status`, errors);
    validateString(record.canonicalName, `${path}.canonicalName`, errors);
    validateCanonicalStringArray(record.aliases, `${path}.aliases`, errors, {
      lowercase: true,
    });
    validateClassification(record.classification, `${path}.classification`, errors);
    validateEnvironment(record.environment, `${path}.environment`, errors);
    validateSuitability(record.suitability, `${path}.suitability`, errors);
    validateSafety(record.safety, `${path}.safety`, errors);
    validateCost(record.cost, `${path}.cost`, errors);
    validatePrescriptionSupport(
      record.prescriptionSupport,
      `${path}.prescriptionSupport`,
      errors,
    );
    validateSelection(record.selection, `${path}.selection`, errors);
    validateExerciseSubstitution(record.substitution, `${path}.substitution`, errors);
    if (id) ids.push(id);
  });
  if (new Set(ids).size !== ids.length) {
    errors.push("$.exercises ids must be unique.");
  }
  if (canonicalizeJson(ids) !== canonicalizeJson([...ids].sort(canonicalCompare))) {
    errors.push("$.exercises must use canonical exercise-id ordering.");
  }
}

function validateSubstitutionRules(value: unknown, errors: string[]) {
  const records = validateRecordArray(value, "$.substitutionRules", errors);
  const ids: string[] = [];
  records.forEach((record, index) => {
    if (!record) return;
    const path = `$.substitutionRules[${index}]`;
    validateExactKeys(record, SUBSTITUTION_RULE_KEYS, path, errors);
    const id = validateString(record.id, `${path}.id`, errors, { identifier: true });
    validateString(record.equivalenceClassId, `${path}.equivalenceClassId`, errors, {
      identifier: true,
    });
    validateString(record.sourceExerciseId, `${path}.sourceExerciseId`, errors, {
      identifier: true,
    });
    validateCanonicalStringArray(
      record.candidateExerciseIds,
      `${path}.candidateExerciseIds`,
      errors,
      { identifier: true, minimum: 1 },
    );
    validateEnum(
      record.reasonCode,
      ["EQUIPMENT_ALTERNATIVE", "RESTRICTION_ALTERNATIVE"],
      `${path}.reasonCode`,
      errors,
    );
    if (id) ids.push(id);
  });
  if (new Set(ids).size !== ids.length) {
    errors.push("$.substitutionRules ids must be unique.");
  }
  if (canonicalizeJson(ids) !== canonicalizeJson([...ids].sort(canonicalCompare))) {
    errors.push("$.substitutionRules must use canonical rule-id ordering.");
  }
}

function normalizedLookup(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function validateCrossReferences(catalog: ExerciseCatalogBundleV1, errors: string[]) {
  const equipmentIds = new Set(catalog.equipment.map((entry) => entry.id));
  const prescriptionClasses = new Map(catalog.prescriptionClasses.map((entry) => [entry.id, entry]));
  const restrictions = new Map(catalog.restrictions.map((entry) => [entry.code, entry]));
  const exercises = new Map(catalog.exercises.map((entry) => [entry.id, entry]));
  const lookupOwners = new Map<string, string>();
  const equipmentAliasOwners = new Map<string, string>();

  for (const equipment of catalog.equipment) {
    for (const alias of [equipment.id, ...equipment.aliases]) {
      const normalized = normalizedLookup(alias);
      const owner = equipmentAliasOwners.get(normalized);
      if (owner && owner !== equipment.id) {
        errors.push(`Equipment lookup value ${alias} is ambiguous between ${owner} and ${equipment.id}.`);
      }
      equipmentAliasOwners.set(normalized, equipment.id);
    }
  }

  for (const exercise of catalog.exercises) {
    if (exercise.status === "active" && exercise.safety.reviewStatus !== "approved") {
      errors.push(`Active exercise ${exercise.id} must have approved safety review.`);
    }

    for (const lookup of [exercise.canonicalName, exercise.id, ...exercise.aliases]) {
      const normalized = normalizedLookup(lookup);
      const owner = lookupOwners.get(normalized);
      if (owner && owner !== exercise.id) {
        errors.push(`Exercise lookup value ${lookup} is ambiguous between ${owner} and ${exercise.id}.`);
      }
      lookupOwners.set(normalized, exercise.id);
    }

    const equipmentReferences = [
      ...exercise.environment.requiredAllEquipment,
      ...exercise.environment.requiredAnyEquipmentGroups.flat(),
      ...exercise.environment.optionalEquipment,
    ];
    equipmentReferences.forEach((id) => {
      if (!equipmentIds.has(id)) {
        errors.push(`Exercise ${exercise.id} references unknown equipment ${id}.`);
      }
    });

    const derivedRestrictionCodes = catalog.restrictions
      .filter((restriction) => restriction.deniedDemandTags.some(
        (tag) => exercise.safety.demandTags.includes(tag),
      ))
      .map((restriction) => restriction.code);
    if (
      canonicalizeJson(exercise.safety.excludedByRestrictionTags)
      !== canonicalizeJson(derivedRestrictionCodes)
    ) {
      errors.push(`Exercise ${exercise.id} restriction exclusions are not derived canonically.`);
    }
    exercise.safety.requiresClearanceTags.forEach((code) => {
      if (!restrictions.has(code)) {
        errors.push(`Exercise ${exercise.id} references unknown clearance restriction ${code}.`);
      }
    });

    const supportedModes = new Set<string>();
    const measurementTypes = new Set<string>();
    exercise.prescriptionSupport.prescriptionClassIds.forEach((id) => {
      const definition = prescriptionClasses.get(id);
      if (!definition) {
        errors.push(`Exercise ${exercise.id} references unknown prescription class ${id}.`);
        return;
      }
      measurementTypes.add(definition.measurementType);
      definition.supportedProgressionModes.forEach((mode) => supportedModes.add(mode));
    });
    if (measurementTypes.size > 1) {
      errors.push(`Exercise ${exercise.id} mixes incompatible measurement types.`);
    }
    exercise.prescriptionSupport.supportedProgressionModes.forEach((mode) => {
      if (!supportedModes.has(mode)) {
        errors.push(`Exercise ${exercise.id} progression mode ${mode} is not supported by its classes.`);
      }
    });
  }

  const ruleKeys = new Set<string>();
  for (const rule of catalog.substitutionRules) {
    const source = exercises.get(rule.sourceExerciseId);
    if (!source || source.status !== "active") {
      errors.push(`Substitution ${rule.id} source must reference an active exercise.`);
      continue;
    }
    if (!source.substitution.equivalenceClassIds.includes(rule.equivalenceClassId)) {
      errors.push(`Substitution ${rule.id} source lacks equivalence class ${rule.equivalenceClassId}.`);
    }
    const ruleKey = `${rule.sourceExerciseId}:${rule.equivalenceClassId}`;
    if (ruleKeys.has(ruleKey)) {
      errors.push(`Substitution source/equivalence pair ${ruleKey} must be unique.`);
    }
    ruleKeys.add(ruleKey);

    for (const candidateId of rule.candidateExerciseIds) {
      if (candidateId === rule.sourceExerciseId) {
        errors.push(`Substitution ${rule.id} cannot reference its source as a candidate.`);
        continue;
      }
      const candidate = exercises.get(candidateId);
      if (!candidate || candidate.status !== "active") {
        errors.push(`Substitution ${rule.id} candidate ${candidateId} must be active.`);
        continue;
      }
      if (!candidate.substitution.equivalenceClassIds.includes(rule.equivalenceClassId)) {
        errors.push(`Substitution ${rule.id} candidate ${candidateId} lacks the equivalence class.`);
      }
      if (
        canonicalizeJson(candidate.classification.movementPatterns)
        !== canonicalizeJson(source.classification.movementPatterns)
      ) {
        errors.push(`Substitution ${rule.id} candidate ${candidateId} changes movement patterns.`);
      }
    }
  }
}

export function buildExerciseCatalogSemanticProjection(catalog: ExerciseCatalogBundleV1) {
  const {
    catalogDigest: _catalogDigest,
    exercises,
    ...root
  } = catalog;
  return {
    ...root,
    exercises: exercises.map(({ canonicalName: _canonicalName, ...exercise }) => exercise),
  };
}

export function digestExerciseCatalog(catalog: ExerciseCatalogBundleV1) {
  return digestCanonicalJson(buildExerciseCatalogSemanticProjection(catalog));
}

export function validateExerciseCatalogBundleV1(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$", errors);
  if (!root) return errors;
  validateExactKeys(root, ROOT_KEYS, "$", errors);
  validateLiteral(root.schemaVersion, EXERCISE_CATALOG_SCHEMA_VERSION, "$.schemaVersion", errors);
  validateLiteral(root.catalogVersion, EXERCISE_CATALOG_VERSION, "$.catalogVersion", errors);
  validateLiteral(
    root.restrictionTaxonomyVersion,
    RESTRICTION_TAXONOMY_VERSION,
    "$.restrictionTaxonomyVersion",
    errors,
  );
  validateLiteral(
    root.prescriptionPolicyVersion,
    PRESCRIPTION_POLICY_VERSION,
    "$.prescriptionPolicyVersion",
    errors,
  );
  validateEquipment(root.equipment, errors);
  validateRestrictions(root.restrictions, errors);
  validatePrescriptionClasses(root.prescriptionClasses, errors);
  validateExercises(root.exercises, errors);
  validateSubstitutionRules(root.substitutionRules, errors);
  if (typeof root.catalogDigest !== "string" || !DIGEST_PATTERN.test(root.catalogDigest)) {
    errors.push("$.catalogDigest must be a lowercase SHA-256 hex digest.");
  }

  if (errors.length === 0) {
    const catalog = value as ExerciseCatalogBundleV1;
    validateCrossReferences(catalog, errors);
    if (errors.length === 0 && digestExerciseCatalog(catalog) !== catalog.catalogDigest) {
      errors.push("$.catalogDigest does not match the semantic catalog projection.");
    }
  }
  return errors;
}

function validateCandidateQuery(value: unknown) {
  const errors: string[] = [];
  const root = asRecord(value, "$query", errors);
  if (!root) return errors;
  validateExactKeys(root, QUERY_KEYS, "$query", errors);
  validateCanonicalStringArray(root.movementPatterns, "$query.movementPatterns", errors, {
    allowed: MOVEMENT_PATTERNS,
    minimum: 1,
  });
  validateCanonicalStringArray(
    root.availableEquipment,
    "$query.availableEquipment",
    errors,
    { allowed: EQUIPMENT_IDS, minimum: 1 },
  );
  validateCanonicalStringArray(
    root.avoidedEquipment,
    "$query.avoidedEquipment",
    errors,
    { allowed: EQUIPMENT_IDS },
  );
  validateCanonicalStringArray(root.restrictionCodes, "$query.restrictionCodes", errors, {
    allowed: RESTRICTION_CODES,
  });
  validateEnum(root.experience, EXPERIENCE_LEVELS, "$query.experience", errors);
  return errors;
}

const EXPERIENCE_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function equipmentRejectionCodes(
  exercise: ExerciseDefinitionV1,
  available: Set<string>,
  avoided: Set<string>,
) {
  const codes = new Set<CatalogCandidateRejectionCode>();
  for (const id of exercise.environment.requiredAllEquipment) {
    if (avoided.has(id)) {
      codes.add("EQUIPMENT_AVOIDED");
    } else if (!available.has(id)) {
      codes.add("EQUIPMENT_UNAVAILABLE");
    }
  }
  for (const group of exercise.environment.requiredAnyEquipmentGroups) {
    const usable = group.some((id) => available.has(id) && !avoided.has(id));
    if (!usable) {
      if (group.some((id) => avoided.has(id))) {
        codes.add("EQUIPMENT_AVOIDED");
      } else {
        codes.add("EQUIPMENT_UNAVAILABLE");
      }
    }
  }
  return codes;
}

export function resolveCatalogCandidates(
  catalog: ExerciseCatalogBundleV1,
  query: CatalogCandidateQueryV1,
): CatalogCandidateResolution {
  const catalogErrors = validateExerciseCatalogBundleV1(catalog);
  if (catalogErrors.length > 0) {
    return {
      status: "invalid_catalog",
      reasonCodes: ["CATALOG_INVALID"],
      validationErrors: catalogErrors,
      compatibleExerciseIds: [],
      rejectedCandidates: [],
    };
  }
  const queryErrors = validateCandidateQuery(query);
  if (queryErrors.length > 0) {
    return {
      status: "invalid_request",
      reasonCodes: ["INVALID_QUERY"],
      validationErrors: queryErrors,
      compatibleExerciseIds: [],
      rejectedCandidates: [],
    };
  }

  const matching = catalog.exercises.filter((exercise) => (
    exercise.status === "active"
    && query.movementPatterns.every((pattern) => (
      exercise.classification.movementPatterns.includes(pattern)
    ))
  ));
  if (matching.length === 0) {
    return {
      status: "unavailable",
      reasonCodes: ["UNSUPPORTED_COVERAGE"],
      compatibleExerciseIds: [],
      rejectedCandidates: [],
    };
  }

  const available = new Set(query.availableEquipment);
  const avoided = new Set(query.avoidedEquipment);
  const restrictions = new Set(query.restrictionCodes);
  const compatibleExerciseIds: string[] = [];
  const rejectedCandidates: Array<{
    exerciseId: string;
    reasonCodes: CatalogCandidateRejectionCode[];
  }> = [];

  for (const exercise of matching) {
    const reasonCodes = equipmentRejectionCodes(exercise, available, avoided);
    if (
      EXPERIENCE_RANK[query.experience]
      < EXPERIENCE_RANK[exercise.suitability.minimumExperience]
    ) {
      reasonCodes.add("EXPERIENCE_UNSUPPORTED");
    }
    if (exercise.safety.excludedByRestrictionTags.some((code) => restrictions.has(code))) {
      reasonCodes.add("RESTRICTION_CONFLICT");
    }

    const orderedReasonCodes = [...reasonCodes].sort(canonicalCompare);
    if (orderedReasonCodes.length === 0) {
      compatibleExerciseIds.push(exercise.id);
    } else {
      rejectedCandidates.push({
        exerciseId: exercise.id,
        reasonCodes: orderedReasonCodes,
      });
    }
  }

  if (compatibleExerciseIds.length > 0) {
    return {
      status: "available",
      compatibleExerciseIds,
      rejectedCandidates,
    };
  }
  const reasonCodes = [...new Set(
    rejectedCandidates.flatMap((candidate) => candidate.reasonCodes),
  )].sort(canonicalCompare);
  return {
    status: "unavailable",
    reasonCodes,
    compatibleExerciseIds: [],
    rejectedCandidates,
  };
}
