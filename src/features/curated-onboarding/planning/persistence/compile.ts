import {
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  EXERCISE_CATALOG_SCHEMA_VERSION,
  EXERCISE_CATALOG_VERSION,
  PRESCRIPTION_POLICY_VERSION,
  RESTRICTION_TAXONOMY_VERSION,
  type ExerciseCatalogBundleV1,
} from "../catalog/contract.ts";
import {
  type CandidateRankingV1,
} from "../ranking/contract.ts";
import {
  validateRoutineAssemblyV1WithReceipt,
  type RoutineAssemblyV1,
} from "../assembly/contract.ts";
import {
  validateRoutineAssemblyAgainstInputsV1,
} from "../assembly/assemble.ts";
import {
  PERSISTENCE_INTENT_COMPILER_VERSION,
  PERSISTENCE_INTENT_ISSUE_POLICY,
  PERSISTENCE_INTENT_POLICY_VERSION,
  PERSISTENCE_INTENT_SCHEMA_VERSION,
  deriveExerciseRecordIdV1,
  derivePersistenceUniquenessKeyV1,
  deriveRoutineRecordIdV1,
  deriveSessionRecordIdV1,
  digestPersistedRoutineV1,
  digestRoutinePersistenceIntent,
  validateRoutinePersistenceIntentV1WithReceipt,
  type PersistenceCatalogPolicyIdentityV1,
  type PersistenceExerciseRecordV1,
  type PersistenceIntentIssueCode,
  type PersistenceIntentIssueV1,
  type PersistenceIntentStatus,
  type PersistenceRankingExplanationV1,
  type PersistenceRequestContextV1,
  type PersistenceRequestIdentityV1,
  type PersistenceSessionRecordV1,
  type RoutineCreationIntentV1,
  type RoutinePersistenceIntentV1,
} from "./contract.ts";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const REQUEST_IDENTIFIER_PATTERN =
  /^[a-z0-9](?:[a-z0-9._:-]{0,126}[a-z0-9])?$/;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStrings(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort(canonicalCompare);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeDigest(value: unknown) {
  return typeof value === "string" && DIGEST_PATTERN.test(value)
    ? value
    : null;
}

function readRequestIdentity(
  value: unknown,
): PersistenceRequestIdentityV1 {
  const request = asRecord(value);
  const userId =
    typeof request?.userId === "string"
    && REQUEST_IDENTIFIER_PATTERN.test(request.userId)
      ? request.userId
      : null;
  const generationRequestId =
    typeof request?.generationRequestId === "string"
    && REQUEST_IDENTIFIER_PATTERN.test(request.generationRequestId)
      ? request.generationRequestId
      : null;
  return {
    userId,
    generationRequestId,
    creationMode:
      request?.creationMode === "create_only" ? "create_only" : null,
    activationMode:
      request?.activationMode === "deferred" ? "deferred" : null,
    uniquenessKey:
      userId && generationRequestId
        ? derivePersistenceUniquenessKeyV1(userId, generationRequestId)
        : null,
  };
}

function requestErrors(value: unknown) {
  const errors: string[] = [];
  const request = asRecord(value);
  const expectedKeys = [
    "activationMode",
    "creationMode",
    "generationRequestId",
    "userId",
  ];
  if (!request) {
    return ["$request must be an object."];
  }
  const keys = Object.keys(request).sort(canonicalCompare);
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
  ) {
    errors.push(
      "$request must contain exactly activationMode, creationMode, generationRequestId, userId.",
    );
  }
  for (const key of ["userId", "generationRequestId"] as const) {
    if (
      typeof request[key] !== "string"
      || !REQUEST_IDENTIFIER_PATTERN.test(request[key] as string)
    ) {
      errors.push(`$request.${key} must be a canonical identifier.`);
    }
  }
  if (request.creationMode !== "create_only") {
    errors.push("$request.creationMode must equal create_only.");
  }
  if (request.activationMode !== "deferred") {
    errors.push("$request.activationMode must equal deferred.");
  }
  return errors;
}

function readCatalogPolicy(
  value: unknown,
): PersistenceCatalogPolicyIdentityV1 {
  const catalog = asRecord(value);
  return {
    schemaVersion:
      catalog?.schemaVersion === EXERCISE_CATALOG_SCHEMA_VERSION
        ? EXERCISE_CATALOG_SCHEMA_VERSION
        : null,
    catalogVersion:
      catalog?.catalogVersion === EXERCISE_CATALOG_VERSION
        ? EXERCISE_CATALOG_VERSION
        : null,
    restrictionTaxonomyVersion:
      catalog?.restrictionTaxonomyVersion === RESTRICTION_TAXONOMY_VERSION
        ? RESTRICTION_TAXONOMY_VERSION
        : null,
    prescriptionPolicyVersion:
      catalog?.prescriptionPolicyVersion === PRESCRIPTION_POLICY_VERSION
        ? PRESCRIPTION_POLICY_VERSION
        : null,
    catalogDigest: safeDigest(catalog?.catalogDigest),
  };
}

function issue(
  code: PersistenceIntentIssueCode,
  values: Iterable<string> = [],
): PersistenceIntentIssueV1 {
  const policy = PERSISTENCE_INTENT_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function finalize(
  status: PersistenceIntentStatus,
  request: PersistenceRequestIdentityV1,
  planning: NormalizedPlanningIntakeV1 | null,
  catalogPolicy: PersistenceCatalogPolicyIdentityV1,
  assembly: RoutineAssemblyV1 | null,
  options: {
    creation?: RoutineCreationIntentV1 | null;
    issues?: PersistenceIntentIssueV1[];
  } = {},
): RoutinePersistenceIntentV1 {
  const withoutDigest = {
    schemaVersion: PERSISTENCE_INTENT_SCHEMA_VERSION,
    compilerVersion: PERSISTENCE_INTENT_COMPILER_VERSION,
    policyVersion: PERSISTENCE_INTENT_POLICY_VERSION,
    request,
    planning,
    catalogPolicy,
    assembly,
    status,
    creation: options.creation ?? null,
    issues: [...(options.issues ?? [])].sort(
      (left, right) => canonicalCompare(left.code, right.code),
    ),
  };
  return {
    ...withoutDigest,
    intentDigest: digestRoutinePersistenceIntent(withoutDigest),
  };
}

function findExplanation(
  ranking: CandidateRankingV1,
  requirementId: string,
  exerciseId: string,
): PersistenceRankingExplanationV1 | null {
  const requirement = ranking.requirements.find(
    (entry) => entry.requirementId === requirementId,
  );
  const candidate = requirement?.candidates.find(
    (entry) => entry.exerciseId === exerciseId,
  );
  return candidate
    ? {
        requirementId,
        ...structuredClone(candidate),
      }
    : null;
}

function buildCreation(
  request: PersistenceRequestIdentityV1 & {
    userId: string;
    generationRequestId: string;
    creationMode: "create_only";
    activationMode: "deferred";
    uniquenessKey: string;
  },
  catalog: ExerciseCatalogBundleV1,
  ranking: CandidateRankingV1,
  assembly: RoutineAssemblyV1 & {
    status: "assembled";
    routine: NonNullable<RoutineAssemblyV1["routine"]>;
  },
): RoutineCreationIntentV1 {
  const routineRecordId = deriveRoutineRecordIdV1(request.uniquenessKey);
  const sessions: PersistenceSessionRecordV1[] = [];
  const exercises: PersistenceExerciseRecordV1[] = [];

  for (const session of assembly.routine.sessions) {
    const sessionRecordId = deriveSessionRecordIdV1(
      routineRecordId,
      session.sessionId,
    );
    const exerciseRecordIds: string[] = [];
    for (const prescription of session.exercises) {
      const recordId = deriveExerciseRecordIdV1(
        sessionRecordId,
        prescription,
      );
      const rankingExplanation = findExplanation(
        ranking,
        prescription.requirementId,
        prescription.exerciseId,
      );
      if (!rankingExplanation) {
        throw new Error(
          `Missing ranking explanation for ${prescription.requirementId}:${prescription.exerciseId}.`,
        );
      }
      exerciseRecordIds.push(recordId);
      exercises.push({
        recordId,
        routineRecordId,
        sessionRecordId,
        sessionId: session.sessionId,
        prescription: structuredClone(prescription),
        rankingExplanation,
        substitutionRules: catalog.substitutionRules
          .filter(
            (rule) => rule.sourceExerciseId === prescription.exerciseId,
          )
          .map((rule) => structuredClone(rule))
          .sort((left, right) => canonicalCompare(left.id, right.id)),
        warmup: null,
      });
    }
    sessions.push({
      recordId: sessionRecordId,
      routineRecordId,
      sessionId: session.sessionId,
      ordinal: session.ordinal,
      weekday: session.weekday,
      timeBudget: structuredClone(session.timeBudget),
      exerciseRecordIds,
    });
  }

  return {
    operation: "create_routine",
    activationMode: "deferred",
    records: {
      routine: {
        recordId: routineRecordId,
        userId: request.userId,
        generationRequestId: request.generationRequestId,
        uniquenessKey: request.uniquenessKey,
        assemblyDigest: assembly.assemblyDigest,
        routineDigest: digestPersistedRoutineV1(assembly.routine),
        schedule: structuredClone(assembly.routine.schedule),
        summary: structuredClone(assembly.routine.summary),
        sessionRecordIds: sessions.map((session) => session.recordId),
        activationState: "not_requested",
      },
      sessions,
      exercises,
    },
  };
}

export function compileRoutinePersistenceIntentV1(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
  prescriptionValue: unknown,
  assemblyValue: unknown,
  requestValue: unknown,
): RoutinePersistenceIntentV1 {
  const request = readRequestIdentity(requestValue);
  const planningErrors =
    validateNormalizedPlanningIntakeV1(planningValue);
  const planning =
    planningErrors.length === 0
      ? structuredClone(planningValue as NormalizedPlanningIntakeV1)
      : null;
  const catalogPolicy = readCatalogPolicy(catalogValue);
  const assemblyReceipt =
    validateRoutineAssemblyV1WithReceipt(assemblyValue);
  const assembly = assemblyReceipt.valid
    ? structuredClone(assemblyValue as RoutineAssemblyV1)
    : null;

  try {
    const invalidRequest = requestErrors(requestValue);
    if (invalidRequest.length > 0) {
      return finalize(
        "invalid_input",
        request,
        planning,
        catalogPolicy,
        assembly,
        {
          issues: [issue("REQUEST_CONTEXT_INVALID", invalidRequest)],
        },
      );
    }
    if (planningErrors.length > 0) {
      return finalize(
        "invalid_input",
        request,
        null,
        catalogPolicy,
        assembly,
        {
          issues: [issue("PLANNING_INVALID", planningErrors)],
        },
      );
    }
    if (!assemblyReceipt.valid) {
      return finalize(
        "invalid_input",
        request,
        planning,
        catalogPolicy,
        null,
        {
          issues: [issue("ASSEMBLY_INVALID", assemblyReceipt.errors)],
        },
      );
    }

    const inputErrors = validateRoutineAssemblyAgainstInputsV1(
      assemblyValue,
      planningValue,
      catalogValue,
      coverageValue,
      rankingValue,
      selectionValue,
      allocationValue,
      prescriptionValue,
    );
    if (inputErrors.length > 0) {
      return finalize(
        "invalid_input",
        request,
        planning,
        catalogPolicy,
        assembly,
        {
          issues: [issue("ASSEMBLY_INPUT_MISMATCH", inputErrors)],
        },
      );
    }

    const exactRequest = request as PersistenceRequestIdentityV1 & {
      userId: string;
      generationRequestId: string;
      creationMode: "create_only";
      activationMode: "deferred";
      uniquenessKey: string;
    };
    const exactAssembly = assemblyValue as RoutineAssemblyV1;
    switch (exactAssembly.status) {
      case "assembled":
        return finalize(
          "ready_to_create",
          request,
          planning,
          catalogPolicy,
          assembly,
          {
            creation: buildCreation(
              exactRequest,
              catalogValue as ExerciseCatalogBundleV1,
              rankingValue as CandidateRankingV1,
              exactAssembly as RoutineAssemblyV1 & {
                status: "assembled";
                routine: NonNullable<RoutineAssemblyV1["routine"]>;
              },
            ),
          },
        );
      case "not_assemblable":
        return finalize(
          "not_creatable",
          request,
          planning,
          catalogPolicy,
          assembly,
          {
            issues: [
              issue(
                "ASSEMBLY_NOT_READY",
                exactAssembly.issues.map((entry) => entry.code),
              ),
            ],
          },
        );
      case "infeasible":
        return finalize(
          "infeasible",
          request,
          planning,
          catalogPolicy,
          assembly,
          {
            issues: [
              issue(
                "ASSEMBLY_INFEASIBLE",
                exactAssembly.issues.map((entry) => entry.code),
              ),
            ],
          },
        );
      case "invalid_input":
        return finalize(
          "invalid_input",
          request,
          planning,
          catalogPolicy,
          assembly,
          {
            issues: [
              issue(
                "ASSEMBLY_INVALID",
                exactAssembly.issues.map((entry) => entry.code),
              ),
            ],
          },
        );
    }
  } catch (error) {
    return finalize(
      "invalid_input",
      request,
      planning,
      catalogPolicy,
      assembly,
      {
        issues: [
          issue("ASSEMBLY_INVALID", [
            error instanceof Error ? error.message : "unknown-error",
          ]),
        ],
      },
    );
  }
}

export function validateRoutinePersistenceIntentAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
  prescriptionValue: unknown,
  assemblyValue: unknown,
  requestValue: unknown,
) {
  const receipt = validateRoutinePersistenceIntentV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as RoutinePersistenceIntentV1;
  const expected = compileRoutinePersistenceIntentV1(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
    allocationValue,
    prescriptionValue,
    assemblyValue,
    requestValue,
  );
  if (supplied.intentDigest !== expected.intentDigest) {
    errors.push(
      "$.intentDigest does not match recompilation from the exact planning, catalog, coverage, ranking, selection, allocation, prescription, assembly, and request inputs.",
    );
  }
  return errors;
}

export function readPersistenceSourceIdentityV1(value: unknown) {
  const root = asRecord(value);
  const request = asRecord(root?.request);
  const assembly = asRecord(root?.assembly);
  return {
    userId: safeString(request?.userId),
    generationRequestId: safeString(request?.generationRequestId),
    uniquenessKey: safeDigest(request?.uniquenessKey),
    assemblyDigest: safeDigest(assembly?.assemblyDigest),
  };
}
