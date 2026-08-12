import { digestCanonicalJson } from "../canonical.ts";
import {
  validateRoutinePersistenceIntentV1WithReceipt,
  type PersistenceRequestContextV1,
  type RoutinePersistenceIntentV1,
} from "../persistence/contract.ts";
import {
  validateRoutinePersistenceIntentAgainstInputsV1,
} from "../persistence/compile.ts";
import {
  validatePlannerPipelineV1WithReceipt,
  type PlannerPipelineStagesV1,
  type PlannerPipelineV1,
} from "../pipeline/contract.ts";

export const PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION =
  "fitness.planner-execution-command.v1" as const;
export const PLANNER_EXECUTION_COMMAND_COMPILER_VERSION =
  "fitness.planner-execution-command-compiler.2026-07-30.v1" as const;
export const PLANNER_EXECUTION_COMMAND_POLICY_VERSION =
  "fitness.planner-execution-command-policy.2026-07-30.v1" as const;
export const PLANNER_EXECUTION_COMMAND_RUNTIME_VALIDATOR_VERSION =
  "fitness.planner-execution-command-validator.2026-07-30.v1" as const;

export const PLANNER_EXECUTION_COMMAND_STATUSES = [
  "executable",
  "not_executable",
  "invalid_input",
] as const;

export const PLANNER_EXECUTION_COMMAND_ISSUE_CODES = [
  "PIPELINE_NOT_EXECUTABLE",
  "PIPELINE_INVALID",
  "PROVIDER_CONTEXT_INVALID",
] as const;

export const PLANNER_EXECUTION_COMMAND_ISSUE_CLASSES = [
  "not_executable",
  "invalid",
] as const;

export const PLANNER_EXECUTION_PROVIDER_CONTEXT_ERROR_CODES = [
  "PROVIDER_CONTEXT_NOT_RECORD",
  "PROVIDER_CONTEXT_KEYS_INVALID",
  "PROVIDER_NAME_INVALID",
  "PROVIDER_START_DATE_INVALID",
  "PROVIDER_TIMEZONE_INVALID",
] as const;

export type PlannerExecutionCommandStatus =
  typeof PLANNER_EXECUTION_COMMAND_STATUSES[number];
export type PlannerExecutionCommandIssueCode =
  typeof PLANNER_EXECUTION_COMMAND_ISSUE_CODES[number];
export type PlannerExecutionCommandIssueClass =
  typeof PLANNER_EXECUTION_COMMAND_ISSUE_CLASSES[number];
export type PlannerExecutionProviderContextErrorCode =
  typeof PLANNER_EXECUTION_PROVIDER_CONTEXT_ERROR_CODES[number];

export type PlannerExecutionProviderContextV1 = {
  name: string;
  startDate: string;
  timezone: string;
};

export type PlannerExecutionExactInputsV1 = {
  planning: NonNullable<PlannerPipelineStagesV1["planning"]>;
  catalog: NonNullable<PlannerPipelineStagesV1["catalog"]>;
  coverage: NonNullable<PlannerPipelineStagesV1["coverage"]>;
  ranking: NonNullable<PlannerPipelineStagesV1["ranking"]>;
  selection: NonNullable<PlannerPipelineStagesV1["selection"]>;
  allocation: NonNullable<PlannerPipelineStagesV1["allocation"]>;
  prescription: NonNullable<PlannerPipelineStagesV1["prescription"]>;
  assembly: NonNullable<PlannerPipelineStagesV1["assembly"]>;
  request: PersistenceRequestContextV1;
};

export type PlannerExecutionPayloadV1 = {
  pipelineDigest: string;
  intent: RoutinePersistenceIntentV1;
  exactInputs: PlannerExecutionExactInputsV1;
  providerContext: PlannerExecutionProviderContextV1;
};

export type PlannerExecutionCommandIssueV1 = {
  code: PlannerExecutionCommandIssueCode;
  issueClass: PlannerExecutionCommandIssueClass;
  path: "/pipeline" | "/providerContext";
  values: string[];
};

export type PlannerExecutionCommandV1 = {
  schemaVersion: typeof PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION;
  compilerVersion: typeof PLANNER_EXECUTION_COMMAND_COMPILER_VERSION;
  policyVersion: typeof PLANNER_EXECUTION_COMMAND_POLICY_VERSION;
  status: PlannerExecutionCommandStatus;
  pipeline: PlannerPipelineV1;
  command: PlannerExecutionPayloadV1 | null;
  issues: PlannerExecutionCommandIssueV1[];
  commandDigest: string;
};

export type PlannerExecutionCommandRuntimeValidationReceiptV1 = {
  validatorVersion:
    typeof PLANNER_EXECUTION_COMMAND_RUNTIME_VALIDATOR_VERSION;
  schemaVersion:
    typeof PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION | null;
  commandDigest: string | null;
  valid: boolean;
  errors: string[];
};

export const PLANNER_EXECUTION_COMMAND_ISSUE_POLICY = {
  PIPELINE_NOT_EXECUTABLE: {
    issueClass: "not_executable",
    path: "/pipeline",
  },
  PIPELINE_INVALID: {
    issueClass: "invalid",
    path: "/pipeline",
  },
  PROVIDER_CONTEXT_INVALID: {
    issueClass: "invalid",
    path: "/providerContext",
  },
} as const satisfies Record<
  PlannerExecutionCommandIssueCode,
  {
    issueClass: PlannerExecutionCommandIssueClass;
    path: PlannerExecutionCommandIssueV1["path"];
  }
>;

const ROOT_KEYS = [
  "command",
  "commandDigest",
  "compilerVersion",
  "issues",
  "pipeline",
  "policyVersion",
  "schemaVersion",
  "status",
] as const;
const COMMAND_KEYS = [
  "exactInputs",
  "intent",
  "pipelineDigest",
  "providerContext",
] as const;
const EXACT_INPUT_KEYS = [
  "allocation",
  "assembly",
  "catalog",
  "coverage",
  "planning",
  "prescription",
  "ranking",
  "request",
  "selection",
] as const;
const PROVIDER_CONTEXT_KEYS = ["name", "startDate", "timezone"] as const;
const ISSUE_KEYS = ["code", "issueClass", "path", "values"] as const;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function canonicalCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStrings(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort(canonicalCompare);
}

function asRecord(
  value: unknown,
  path: string,
  errors: string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  return value as Record<string, unknown>;
}

function validateExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
  errors: string[],
) {
  const actual = Object.keys(value).sort(canonicalCompare);
  const canonicalExpected = [...expected].sort(canonicalCompare);
  if (
    actual.length !== canonicalExpected.length
    || actual.some((key, index) => key !== canonicalExpected[index])
  ) {
    errors.push(
      `${path} must contain exactly: ${canonicalExpected.join(", ")}.`,
    );
  }
}

function validateCanonicalStrings(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [] as string[];
  }
  const strings = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.length > 0,
  );
  if (strings.length !== value.length) {
    errors.push(`${path} must contain non-empty strings.`);
  }
  if (
    new Set(strings).size !== strings.length
    || [...strings].sort(canonicalCompare).some(
      (entry, index) => entry !== strings[index],
    )
  ) {
    errors.push(`${path} must contain unique canonical strings.`);
  }
  return strings;
}

function stableEqual(left: unknown, right: unknown) {
  try {
    return digestCanonicalJson(left) === digestCanonicalJson(right);
  } catch {
    return false;
  }
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isSupportedTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validatePlannerExecutionProviderContextUnsafe(
  value: unknown,
) {
  const errorCodes: PlannerExecutionProviderContextErrorCode[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      context: null,
      errorCodes: ["PROVIDER_CONTEXT_NOT_RECORD"] as const,
    };
  }
  const root = value as Record<string, unknown>;
  const keys = Object.keys(root).sort(canonicalCompare);
  const name = root.name;
  const startDate = root.startDate;
  const timezone = root.timezone;
  if (
    keys.length !== PROVIDER_CONTEXT_KEYS.length
    || [...PROVIDER_CONTEXT_KEYS].sort(canonicalCompare).some(
      (key, index) => key !== keys[index],
    )
  ) {
    errorCodes.push("PROVIDER_CONTEXT_KEYS_INVALID");
  }
  if (
    typeof name !== "string"
    || name.length < 1
    || name.length > 120
    || name !== name.trim()
    || CONTROL_CHARACTER_PATTERN.test(name)
  ) {
    errorCodes.push("PROVIDER_NAME_INVALID");
  }
  if (
    typeof startDate !== "string"
    || !isRealDate(startDate)
  ) {
    errorCodes.push("PROVIDER_START_DATE_INVALID");
  }
  if (
    typeof timezone !== "string"
    || timezone.length < 1
    || timezone.length > 120
    || timezone !== timezone.trim()
    || !isSupportedTimezone(timezone)
  ) {
    errorCodes.push("PROVIDER_TIMEZONE_INVALID");
  }
  if (errorCodes.length > 0) {
    return {
      context: null,
      errorCodes: canonicalStrings(
        errorCodes,
      ) as PlannerExecutionProviderContextErrorCode[],
    };
  }
  return {
    context: {
      name: name as string,
      startDate: startDate as string,
      timezone: timezone as string,
    },
    errorCodes: [] as PlannerExecutionProviderContextErrorCode[],
  };
}

export function validatePlannerExecutionProviderContextV1(
  value: unknown,
) {
  try {
    return validatePlannerExecutionProviderContextUnsafe(value);
  } catch {
    return {
      context: null,
      errorCodes: ["PROVIDER_CONTEXT_NOT_RECORD"] as const,
    };
  }
}

export function createPlannerExecutionCommandIssue(
  code: PlannerExecutionCommandIssueCode,
  values: Iterable<string>,
): PlannerExecutionCommandIssueV1 {
  const policy = PLANNER_EXECUTION_COMMAND_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

export function buildPlannerExecutionCommandSemanticProjection(
  value: Omit<PlannerExecutionCommandV1, "commandDigest">
    | PlannerExecutionCommandV1,
) {
  const { commandDigest: _commandDigest, ...projection } =
    value as PlannerExecutionCommandV1;
  return projection;
}

export function digestPlannerExecutionCommand(
  value: Omit<PlannerExecutionCommandV1, "commandDigest">
    | PlannerExecutionCommandV1,
) {
  return digestCanonicalJson(
    buildPlannerExecutionCommandSemanticProjection(value),
  );
}

function expectedPipelineIssue(
  pipeline: PlannerPipelineV1,
): PlannerExecutionCommandIssueV1 {
  const values = [pipeline.status, pipeline.terminalStage];
  return pipeline.status === "invalid_input"
    ? createPlannerExecutionCommandIssue("PIPELINE_INVALID", values)
    : createPlannerExecutionCommandIssue(
        "PIPELINE_NOT_EXECUTABLE",
        values,
      );
}

function expectedCommandFromPipeline(
  pipeline: PlannerPipelineV1,
  providerContext: PlannerExecutionProviderContextV1,
): PlannerExecutionPayloadV1 | null {
  const stages = pipeline.stages;
  if (
    pipeline.status !== "ready"
    || pipeline.terminalStage !== "persistence_intent"
    || !pipeline.request
    || !stages.planning
    || !stages.catalog
    || !stages.coverage
    || !stages.ranking
    || !stages.selection
    || !stages.allocation
    || !stages.prescription
    || !stages.assembly
    || !stages.persistence_intent
  ) {
    return null;
  }
  return {
    pipelineDigest: pipeline.pipelineDigest,
    intent: stages.persistence_intent,
    exactInputs: {
      planning: stages.planning,
      catalog: stages.catalog,
      coverage: stages.coverage,
      ranking: stages.ranking,
      selection: stages.selection,
      allocation: stages.allocation,
      prescription: stages.prescription,
      assembly: stages.assembly,
      request: pipeline.request,
    },
    providerContext,
  };
}

function validateIssue(
  value: unknown,
  index: number,
  errors: string[],
) {
  const path = `$.issues[${index}]`;
  const issue = asRecord(value, path, errors);
  if (!issue) return null;
  validateExactKeys(issue, ISSUE_KEYS, path, errors);
  const code = issue.code;
  if (
    typeof code !== "string"
    || !PLANNER_EXECUTION_COMMAND_ISSUE_CODES.includes(
      code as PlannerExecutionCommandIssueCode,
    )
  ) {
    errors.push(`${path}.code must be a closed execution-command issue code.`);
    validateCanonicalStrings(issue.values, `${path}.values`, errors);
    return null;
  }
  const policy =
    PLANNER_EXECUTION_COMMAND_ISSUE_POLICY[
      code as PlannerExecutionCommandIssueCode
    ];
  if (issue.issueClass !== policy.issueClass) {
    errors.push(`${path}.issueClass must match the issue policy.`);
  }
  if (issue.path !== policy.path) {
    errors.push(`${path}.path must match the issue policy.`);
  }
  const values = validateCanonicalStrings(
    issue.values,
    `${path}.values`,
    errors,
  );
  if (code === "PROVIDER_CONTEXT_INVALID") {
    if (
      values.length < 1
      || values.some(
        (entry) =>
          !PLANNER_EXECUTION_PROVIDER_CONTEXT_ERROR_CODES.includes(
            entry as PlannerExecutionProviderContextErrorCode,
          ),
      )
    ) {
      errors.push(
        `${path}.values must contain only closed provider-context error codes.`,
      );
    }
  }
  return issue as unknown as PlannerExecutionCommandIssueV1;
}

function validateCommandPayload(
  value: unknown,
  pipeline: PlannerPipelineV1,
  errors: string[],
) {
  const command = asRecord(value, "$.command", errors);
  if (!command) return null;
  validateExactKeys(command, COMMAND_KEYS, "$.command", errors);
  if (
    typeof command.pipelineDigest !== "string"
    || !DIGEST_PATTERN.test(command.pipelineDigest)
  ) {
    errors.push("$.command.pipelineDigest must be a lowercase SHA-256 digest.");
  }
  if (command.pipelineDigest !== pipeline.pipelineDigest) {
    errors.push(
      "$.command.pipelineDigest must match the embedded pipeline digest.",
    );
  }
  const exactInputs = asRecord(
    command.exactInputs,
    "$.command.exactInputs",
    errors,
  );
  if (exactInputs) {
    validateExactKeys(
      exactInputs,
      EXACT_INPUT_KEYS,
      "$.command.exactInputs",
      errors,
    );
  }
  const providerValidation =
    validatePlannerExecutionProviderContextV1(command.providerContext);
  if (!providerValidation.context) {
    errors.push(
      "$.command.providerContext must pass the closed provider-context policy.",
    );
  }
  const expected = providerValidation.context
    ? expectedCommandFromPipeline(pipeline, providerValidation.context)
    : null;
  if (!expected || !stableEqual(command, expected)) {
    errors.push(
      "$.command must derive exactly from the embedded ready pipeline and provider context.",
    );
  }
  const intentReceipt =
    validateRoutinePersistenceIntentV1WithReceipt(command.intent);
  errors.push(
    ...intentReceipt.errors.map(
      (entry) => `$.command.intent: ${entry}`,
    ),
  );
  if (exactInputs) {
    errors.push(
      ...validateRoutinePersistenceIntentAgainstInputsV1(
        command.intent,
        exactInputs.planning,
        exactInputs.catalog,
        exactInputs.coverage,
        exactInputs.ranking,
        exactInputs.selection,
        exactInputs.allocation,
        exactInputs.prescription,
        exactInputs.assembly,
        exactInputs.request,
      ).map(
        (entry) => `$.command.intent exact inputs: ${entry}`,
      ),
    );
  }
  return command as unknown as PlannerExecutionPayloadV1;
}

export function validatePlannerExecutionCommandV1(
  value: unknown,
) {
  const errors: string[] = [];
  try {
    const root = asRecord(value, "$", errors);
    if (!root) return errors;
    validateExactKeys(root, ROOT_KEYS, "$", errors);
    if (root.schemaVersion !== PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION) {
      errors.push("$.schemaVersion must match Planner Execution Command v1.");
    }
    if (
      root.compilerVersion !==
        PLANNER_EXECUTION_COMMAND_COMPILER_VERSION
    ) {
      errors.push("$.compilerVersion must match the execution compiler.");
    }
    if (
      root.policyVersion !== PLANNER_EXECUTION_COMMAND_POLICY_VERSION
    ) {
      errors.push("$.policyVersion must match the execution policy.");
    }
    if (
      typeof root.status !== "string"
      || !PLANNER_EXECUTION_COMMAND_STATUSES.includes(
        root.status as PlannerExecutionCommandStatus,
      )
    ) {
      errors.push("$.status must be a closed execution-command status.");
    }
    if (
      typeof root.commandDigest !== "string"
      || !DIGEST_PATTERN.test(root.commandDigest)
    ) {
      errors.push("$.commandDigest must be a lowercase SHA-256 digest.");
    }

    const pipelineReceipt =
      validatePlannerPipelineV1WithReceipt(root.pipeline);
    errors.push(
      ...pipelineReceipt.errors.map((entry) => `$.pipeline: ${entry}`),
    );
    const pipeline =
      root.pipeline as PlannerPipelineV1;
    const issues = Array.isArray(root.issues)
      ? root.issues
        .map((issue, index) => validateIssue(issue, index, errors))
        .filter(
          (issue): issue is PlannerExecutionCommandIssueV1 =>
            issue !== null,
        )
      : [];
    if (!Array.isArray(root.issues)) {
      errors.push("$.issues must be an array.");
    }

    if (pipelineReceipt.valid) {
      if (pipeline.status === "ready") {
        if (root.status === "executable") {
          if (issues.length !== 0) {
            errors.push("$.issues must be empty when status is executable.");
          }
          if (root.command === null) {
            errors.push("$.command must be complete when status is executable.");
          } else {
            validateCommandPayload(root.command, pipeline, errors);
          }
        } else if (root.status === "invalid_input") {
          if (root.command !== null) {
            errors.push("$.command must be null when provider context is invalid.");
          }
          const issue = issues[0];
          if (
            issues.length !== 1
            || issue?.code !== "PROVIDER_CONTEXT_INVALID"
          ) {
            errors.push(
              "$.issues must contain only PROVIDER_CONTEXT_INVALID for a ready pipeline with invalid input.",
            );
          }
        } else {
          errors.push(
            "$.status must be executable or invalid_input when the pipeline is ready.",
          );
        }
      } else {
        const expectedIssueValue = expectedPipelineIssue(pipeline);
        const expectedStatus: PlannerExecutionCommandStatus =
          pipeline.status === "invalid_input"
            ? "invalid_input"
            : "not_executable";
        if (root.status !== expectedStatus) {
          errors.push(
            `$.status must equal ${expectedStatus} for the embedded pipeline terminal.`,
          );
        }
        if (root.command !== null) {
          errors.push("$.command must be null after a non-ready pipeline.");
        }
        if (
          issues.length !== 1
          || !stableEqual(issues[0], expectedIssueValue)
        ) {
          errors.push(
            "$.issues must contain the exact stage-attributed pipeline terminal.",
          );
        }
      }
    }

    try {
      const expectedDigest = digestPlannerExecutionCommand(
        value as PlannerExecutionCommandV1,
      );
      if (root.commandDigest !== expectedDigest) {
        errors.push(
          "$.commandDigest does not match the semantic execution-command projection.",
        );
      }
    } catch {
      errors.push(
        "$.commandDigest cannot be recomputed from non-canonical JSON.",
      );
    }
  } catch {
    errors.push("$ must be a non-throwing canonical execution command.");
  }
  return errors;
}

function readPlannerExecutionCommandReceiptIdentity(
  value: unknown,
): Pick<
  PlannerExecutionCommandRuntimeValidationReceiptV1,
  "schemaVersion" | "commandDigest"
> {
  try {
    const root =
      value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
    const schemaVersion = root?.schemaVersion;
    const commandDigest = root?.commandDigest;
    return {
      schemaVersion:
        schemaVersion === PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION
          ? PLANNER_EXECUTION_COMMAND_SCHEMA_VERSION
          : null,
      commandDigest:
        typeof commandDigest === "string"
        && DIGEST_PATTERN.test(commandDigest)
          ? commandDigest
          : null,
    };
  } catch {
    return {
      schemaVersion: null,
      commandDigest: null,
    };
  }
}

export function validatePlannerExecutionCommandV1WithReceipt(
  value: unknown,
): PlannerExecutionCommandRuntimeValidationReceiptV1 {
  const errors = validatePlannerExecutionCommandV1(value);
  const identity = readPlannerExecutionCommandReceiptIdentity(value);
  return {
    validatorVersion:
      PLANNER_EXECUTION_COMMAND_RUNTIME_VALIDATOR_VERSION,
    ...identity,
    valid: errors.length === 0,
    errors,
  };
}
