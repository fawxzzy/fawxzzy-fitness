import {
  SESSION_PRESCRIPTION_STATUSES,
  validateSessionPrescriptionV1WithReceipt,
  type SessionPrescriptionV1,
  type SessionPrescriptionStatus,
} from "../prescription/contract.ts";
import {
  validateSessionPrescriptionAgainstInputsV1,
} from "../prescription/prescribe.ts";
import {
  ROUTINE_ASSEMBLY_COMPILER_VERSION,
  ROUTINE_ASSEMBLY_ISSUE_POLICY,
  ROUTINE_ASSEMBLY_POLICY_VERSION,
  ROUTINE_ASSEMBLY_SCHEMA_VERSION,
  digestRoutineAssembly,
  validateRoutineAssemblyV1WithReceipt,
  type RoutineAssemblyInputIdentityV1,
  type RoutineAssemblyIssueCode,
  type RoutineAssemblyIssueV1,
  type RoutineAssemblyStatus,
  type RoutineAssemblyV1,
  type RoutinePlanEnvelopeV1,
} from "./contract.ts";

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
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
    ? value
    : null;
}

function safePrescriptionStatus(value: unknown): SessionPrescriptionStatus | null {
  return typeof value === "string"
      && SESSION_PRESCRIPTION_STATUSES.includes(
        value as SessionPrescriptionStatus,
      )
    ? value as SessionPrescriptionStatus
    : null;
}

function readInputIdentity(
  prescriptionValue: unknown,
): RoutineAssemblyInputIdentityV1 {
  const prescription = asRecord(prescriptionValue);
  const input = asRecord(prescription?.input);
  return {
    planningContractVersion: safeString(input?.planningContractVersion),
    planningNormalizerVersion: safeString(input?.planningNormalizerVersion),
    planningGenerationDigest: safeDigest(
      input?.planningGenerationDigest,
    ),
    catalogSchemaVersion: safeString(input?.catalogSchemaVersion),
    catalogVersion: safeString(input?.catalogVersion),
    catalogDigest: safeDigest(input?.catalogDigest),
    coverageSchemaVersion: safeString(input?.coverageSchemaVersion),
    coverageCompilerVersion: safeString(input?.coverageCompilerVersion),
    coveragePolicyVersion: safeString(input?.coveragePolicyVersion),
    coverageDigest: safeDigest(input?.coverageDigest),
    coverageStatus:
      typeof input?.coverageStatus === "string"
        ? input.coverageStatus as RoutineAssemblyInputIdentityV1["coverageStatus"]
        : null,
    rankingSchemaVersion: safeString(input?.rankingSchemaVersion),
    rankingCompilerVersion: safeString(input?.rankingCompilerVersion),
    rankingPolicyVersion: safeString(input?.rankingPolicyVersion),
    rankingDigest: safeDigest(input?.rankingDigest),
    rankingStatus:
      typeof input?.rankingStatus === "string"
        ? input.rankingStatus as RoutineAssemblyInputIdentityV1["rankingStatus"]
        : null,
    selectionSchemaVersion: safeString(input?.selectionSchemaVersion),
    selectionCompilerVersion: safeString(input?.selectionCompilerVersion),
    selectionPolicyVersion: safeString(input?.selectionPolicyVersion),
    selectionDigest: safeDigest(input?.selectionDigest),
    selectionStatus:
      typeof input?.selectionStatus === "string"
        ? input.selectionStatus as RoutineAssemblyInputIdentityV1["selectionStatus"]
        : null,
    allocationSchemaVersion: safeString(input?.allocationSchemaVersion),
    allocationCompilerVersion: safeString(input?.allocationCompilerVersion),
    allocationPolicyVersion: safeString(input?.allocationPolicyVersion),
    allocationDigest: safeDigest(input?.allocationDigest),
    allocationStatus:
      typeof input?.allocationStatus === "string"
        ? input.allocationStatus as RoutineAssemblyInputIdentityV1["allocationStatus"]
        : null,
    prescriptionSchemaVersion: safeString(prescription?.schemaVersion),
    prescriptionCompilerVersion: safeString(prescription?.compilerVersion),
    prescriptionPolicyVersion: safeString(prescription?.policyVersion),
    prescriptionDigest: safeDigest(prescription?.prescriptionDigest),
    prescriptionStatus: safePrescriptionStatus(prescription?.status),
  };
}

function issue(
  code: RoutineAssemblyIssueCode,
  values: Iterable<string> = [],
): RoutineAssemblyIssueV1 {
  const policy = ROUTINE_ASSEMBLY_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function finalize(
  status: RoutineAssemblyStatus,
  input: RoutineAssemblyInputIdentityV1,
  options: {
    routine?: RoutinePlanEnvelopeV1 | null;
    issues?: RoutineAssemblyIssueV1[];
  } = {},
): RoutineAssemblyV1 {
  const withoutDigest = {
    schemaVersion: ROUTINE_ASSEMBLY_SCHEMA_VERSION,
    compilerVersion: ROUTINE_ASSEMBLY_COMPILER_VERSION,
    policyVersion: ROUTINE_ASSEMBLY_POLICY_VERSION,
    input,
    status,
    routine: options.routine ?? null,
    issues: [...(options.issues ?? [])].sort((left, right) => (
      canonicalCompare(left.code, right.code)
    )),
  };
  return {
    ...withoutDigest,
    assemblyDigest: digestRoutineAssembly(withoutDigest),
  };
}

function buildRoutine(
  prescription: SessionPrescriptionV1,
): RoutinePlanEnvelopeV1 {
  return {
    schedule: structuredClone(prescription.schedule!),
    sessions: prescription.sessions.map((session) => ({
      sessionId: session.sessionId,
      ordinal: session.ordinal,
      weekday: session.weekday,
      exercises: structuredClone(session.exercisePrescriptions),
      timeBudget: structuredClone(session.timeBudget),
    })),
    summary: structuredClone(prescription.summary!),
  };
}

export function compileRoutineAssemblyV1(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
  prescriptionValue: unknown,
): RoutineAssemblyV1 {
  const input = readInputIdentity(prescriptionValue);
  try {
    const receipt = validateSessionPrescriptionV1WithReceipt(
      prescriptionValue,
    );
    if (!receipt.valid) {
      return finalize("invalid_input", input, {
        issues: [issue("PRESCRIPTION_INVALID", receipt.errors)],
      });
    }

    const inputErrors = validateSessionPrescriptionAgainstInputsV1(
      prescriptionValue,
      planningValue,
      catalogValue,
      coverageValue,
      rankingValue,
      selectionValue,
      allocationValue,
    );
    if (inputErrors.length > 0) {
      return finalize("invalid_input", input, {
        issues: [issue("PRESCRIPTION_INPUT_MISMATCH", inputErrors)],
      });
    }

    const prescription = prescriptionValue as SessionPrescriptionV1;
    switch (prescription.status) {
      case "prescribed":
        return finalize("assembled", input, {
          routine: buildRoutine(prescription),
        });
      case "not_prescribable":
        return finalize("not_assemblable", input, {
          issues: [
            issue(
              "PRESCRIPTION_NOT_READY",
              prescription.issues.map((entry) => entry.code),
            ),
          ],
        });
      case "infeasible":
        return finalize("infeasible", input, {
          issues: [
            issue(
              "PRESCRIPTION_INFEASIBLE",
              prescription.issues.map((entry) => entry.code),
            ),
          ],
        });
      case "invalid_input":
        return finalize("invalid_input", input, {
          issues: [
            issue(
              "PRESCRIPTION_INVALID",
              prescription.issues.map((entry) => entry.code),
            ),
          ],
        });
    }
  } catch (error) {
    return finalize("invalid_input", input, {
      issues: [
        issue("PRESCRIPTION_INVALID", [
          error instanceof Error ? error.message : "unknown-error",
        ]),
      ],
    });
  }
}

export function validateRoutineAssemblyAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
  prescriptionValue: unknown,
) {
  const receipt = validateRoutineAssemblyV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as RoutineAssemblyV1;
  const expected = compileRoutineAssemblyV1(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
    allocationValue,
    prescriptionValue,
  );
  if (supplied.assemblyDigest !== expected.assemblyDigest) {
    errors.push(
      "$.assemblyDigest does not match recompilation from the supplied planning, catalog, coverage, ranking, selection, allocation, and prescription inputs.",
    );
  }
  return errors;
}
