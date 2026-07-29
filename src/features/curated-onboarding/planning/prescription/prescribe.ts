import {
  validateNormalizedPlanningIntakeV1,
  type NormalizedPlanningIntakeV1,
} from "../contract.ts";
import {
  validateExerciseCatalogBundleV1,
} from "../catalog/validate.ts";
import {
  COVERAGE_STATUSES,
  type CoverageCompilationV1,
} from "../coverage/contract.ts";
import {
  validateCoverageCompilationAgainstInputsV1,
} from "../coverage/compile.ts";
import {
  validateCoverageCompilationV1WithReceipt,
} from "../coverage/contract.ts";
import {
  CANDIDATE_RANKING_STATUSES,
} from "../ranking/contract.ts";
import {
  validateCandidateRankingAgainstInputsV1,
} from "../ranking/rank.ts";
import {
  validateCandidateRankingV1WithReceipt,
} from "../ranking/contract.ts";
import {
  GLOBAL_SELECTION_STATUSES,
} from "../selection/contract.ts";
import {
  validateGlobalSelectionAgainstInputsV1,
} from "../selection/select.ts";
import {
  validateGlobalSelectionV1WithReceipt,
} from "../selection/contract.ts";
import {
  SESSION_ALLOCATION_STATUSES,
  type SessionAllocationScheduleV1,
  type SessionAllocationV1,
} from "../allocation/contract.ts";
import {
  validateSessionAllocationAgainstInputsV1,
} from "../allocation/allocate.ts";
import {
  validateSessionAllocationV1WithReceipt,
} from "../allocation/contract.ts";
import {
  type ExerciseCatalogBundleV1,
  type ExerciseDefinitionV1,
  type PrescriptionClassDefinitionV1,
  type PrescriptionClassId,
  type ProgressionMode,
} from "../catalog/contract.ts";
import {
  SESSION_PRESCRIPTION_CLASS_POLICY,
  SESSION_PRESCRIPTION_COMPILER_VERSION,
  SESSION_PRESCRIPTION_ISSUE_POLICY,
  SESSION_PRESCRIPTION_POLICY_VERSION,
  SESSION_PRESCRIPTION_REST_SECONDS,
  SESSION_PRESCRIPTION_SCHEMA_VERSION,
  digestSessionPrescription,
  validateSessionPrescriptionV1WithReceipt,
  type ExercisePrescriptionTargetV1,
  type ExercisePrescriptionV1,
  type PrescribedSessionV1,
  type SessionPrescriptionInputIdentityV1,
  type SessionPrescriptionIssueCode,
  type SessionPrescriptionIssueV1,
  type SessionPrescriptionStatus,
  type SessionPrescriptionSummaryV1,
  type SessionPrescriptionV1,
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

function readInputIdentity(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
): SessionPrescriptionInputIdentityV1 {
  const planning = asRecord(planningValue);
  const planningSource = asRecord(planning?.source);
  const catalog = asRecord(catalogValue);
  const coverage = asRecord(coverageValue);
  const ranking = asRecord(rankingValue);
  const selection = asRecord(selectionValue);
  const allocation = asRecord(allocationValue);
  const coverageStatus = coverage?.status;
  const rankingStatus = ranking?.status;
  const selectionStatus = selection?.status;
  const allocationStatus = allocation?.status;
  return {
    planningContractVersion: safeString(planning?.contractVersion),
    planningNormalizerVersion: safeString(planningSource?.normalizerVersion),
    planningGenerationDigest: safeDigest(planning?.generationProjectionDigest),
    catalogSchemaVersion: safeString(catalog?.schemaVersion),
    catalogVersion: safeString(catalog?.catalogVersion),
    catalogDigest: safeDigest(catalog?.catalogDigest),
    coverageSchemaVersion: safeString(coverage?.schemaVersion),
    coverageCompilerVersion: safeString(coverage?.compilerVersion),
    coveragePolicyVersion: safeString(coverage?.policyVersion),
    coverageDigest: safeDigest(coverage?.coverageDigest),
    coverageStatus:
      typeof coverageStatus === "string"
      && COVERAGE_STATUSES.includes(
        coverageStatus as typeof COVERAGE_STATUSES[number],
      )
        ? coverageStatus as typeof COVERAGE_STATUSES[number]
        : null,
    rankingSchemaVersion: safeString(ranking?.schemaVersion),
    rankingCompilerVersion: safeString(ranking?.compilerVersion),
    rankingPolicyVersion: safeString(ranking?.policyVersion),
    rankingDigest: safeDigest(ranking?.rankingDigest),
    rankingStatus:
      typeof rankingStatus === "string"
      && CANDIDATE_RANKING_STATUSES.includes(
        rankingStatus as typeof CANDIDATE_RANKING_STATUSES[number],
      )
        ? rankingStatus as typeof CANDIDATE_RANKING_STATUSES[number]
        : null,
    selectionSchemaVersion: safeString(selection?.schemaVersion),
    selectionCompilerVersion: safeString(selection?.compilerVersion),
    selectionPolicyVersion: safeString(selection?.policyVersion),
    selectionDigest: safeDigest(selection?.selectionDigest),
    selectionStatus:
      typeof selectionStatus === "string"
      && GLOBAL_SELECTION_STATUSES.includes(
        selectionStatus as typeof GLOBAL_SELECTION_STATUSES[number],
      )
        ? selectionStatus as typeof GLOBAL_SELECTION_STATUSES[number]
        : null,
    allocationSchemaVersion: safeString(allocation?.schemaVersion),
    allocationCompilerVersion: safeString(allocation?.compilerVersion),
    allocationPolicyVersion: safeString(allocation?.policyVersion),
    allocationDigest: safeDigest(allocation?.allocationDigest),
    allocationStatus:
      typeof allocationStatus === "string"
      && SESSION_ALLOCATION_STATUSES.includes(
        allocationStatus as typeof SESSION_ALLOCATION_STATUSES[number],
      )
        ? allocationStatus as typeof SESSION_ALLOCATION_STATUSES[number]
        : null,
  };
}

function issue(
  code: SessionPrescriptionIssueCode,
  values: Iterable<string> = [],
): SessionPrescriptionIssueV1 {
  const policy = SESSION_PRESCRIPTION_ISSUE_POLICY[code];
  return {
    code,
    issueClass: policy.issueClass,
    path: policy.path,
    values: canonicalStrings(values),
  };
}

function finalize(
  status: SessionPrescriptionStatus,
  input: SessionPrescriptionInputIdentityV1,
  options: {
    schedule?: SessionAllocationScheduleV1 | null;
    sessions?: PrescribedSessionV1[];
    summary?: SessionPrescriptionSummaryV1 | null;
    issues?: SessionPrescriptionIssueV1[];
  } = {},
): SessionPrescriptionV1 {
  const withoutDigest = {
    schemaVersion: SESSION_PRESCRIPTION_SCHEMA_VERSION,
    compilerVersion: SESSION_PRESCRIPTION_COMPILER_VERSION,
    policyVersion: SESSION_PRESCRIPTION_POLICY_VERSION,
    input,
    status,
    schedule: options.schedule ?? null,
    sessions: options.sessions ?? [],
    summary: options.summary ?? null,
    issues: [...(options.issues ?? [])].sort((left, right) => (
      canonicalCompare(left.code, right.code)
    )),
  };
  return {
    ...withoutDigest,
    prescriptionDigest: digestSessionPrescription(withoutDigest),
  };
}

function copySchedule(
  schedule: SessionAllocationScheduleV1,
): SessionAllocationScheduleV1 {
  return {
    requestedDaysPerWeek: schedule.requestedDaysPerWeek,
    weekdays: [...schedule.weekdays],
    dayConstraint: schedule.dayConstraint,
    flexibility: schedule.flexibility,
    sessionMinutes: {
      target: schedule.sessionMinutes.target,
      hardMaximum: schedule.sessionMinutes.hardMaximum,
    },
  };
}

function baselineSetCount(
  classId: PrescriptionClassId,
  planning: NormalizedPlanningIntakeV1,
) {
  const policy = SESSION_PRESCRIPTION_CLASS_POLICY[classId];
  if (classId === "cardio-time-distance-v1") {
    return policy.minimumSets;
  }
  const byExperience = {
    beginner: 2,
    intermediate: 3,
    advanced: 4,
  } as const;
  const experience = planning.trainingBackground.experience;
  const baseline = experience ? byExperience[experience] : policy.minimumSets;
  const adjusted =
    planning.recovery.planningModifier === "conservative"
      ? baseline - 1
      : baseline;
  return Math.min(
    policy.maximumSets,
    Math.max(policy.minimumSets, adjusted),
  );
}

function repetitionTarget(
  goal: NonNullable<NormalizedPlanningIntakeV1["goals"]["primary"]>,
): ExercisePrescriptionTargetV1 {
  switch (goal) {
    case "get_stronger":
      return { unit: "reps", minimum: 5, maximum: 8 };
    case "build_muscle":
      return { unit: "reps", minimum: 8, maximum: 12 };
    case "athleticism":
      return { unit: "reps", minimum: 8, maximum: 12 };
    case "get_leaner":
    case "general_fitness":
    default:
      return { unit: "reps", minimum: 10, maximum: 15 };
  }
}

function durationTarget(
  planning: NormalizedPlanningIntakeV1,
): ExercisePrescriptionTargetV1 {
  switch (planning.trainingBackground.experience) {
    case "advanced":
      return { unit: "seconds", minimum: 40, maximum: 60 };
    case "intermediate":
      return { unit: "seconds", minimum: 30, maximum: 45 };
    case "beginner":
    default:
      return { unit: "seconds", minimum: 20, maximum: 30 };
  }
}

function cardioTarget(
  planning: NormalizedPlanningIntakeV1,
): ExercisePrescriptionTargetV1 {
  const minutes =
    planning.preferences.cardio.priority === "primary"
      ? 20
      : planning.preferences.cardio.priority === "supporting"
        ? 10
        : 5;
  return { unit: "minutes", minimum: minutes, maximum: minutes };
}

function targetForClass(
  classId: PrescriptionClassId,
  planning: NormalizedPlanningIntakeV1,
) {
  if (classId === "core-duration-v1") return durationTarget(planning);
  if (classId === "cardio-time-distance-v1") {
    return cardioTarget(planning);
  }
  return repetitionTarget(
    planning.goals.primary
      ?? "general_fitness",
  );
}

function restForClass(
  classId: PrescriptionClassId,
  planning: NormalizedPlanningIntakeV1,
): typeof SESSION_PRESCRIPTION_REST_SECONDS[number] {
  if (classId === "cardio-time-distance-v1") return 0;
  if (classId === "core-duration-v1") return 45;
  switch (planning.goals.primary) {
    case "get_stronger":
      return 120;
    case "build_muscle":
      return 90;
    case "athleticism":
      return 75;
    case "general_fitness":
    default:
      return 60;
  }
}

function progressionForClass(
  classId: PrescriptionClassId,
): ProgressionMode {
  switch (classId) {
    case "bodyweight-reps-v1":
      return "reps";
    case "cardio-time-distance-v1":
      return "duration";
    case "core-duration-v1":
      return "duration";
    case "resistance-load-reps-v1":
      return "load_and_reps";
  }
}

function activeSecondsPerSet(
  exercise: ExerciseDefinitionV1,
  classId: PrescriptionClassId,
  target: ExercisePrescriptionTargetV1,
) {
  if (classId === "cardio-time-distance-v1") {
    return target.maximum * 60;
  }
  if (classId === "core-duration-v1") {
    return Math.max(
      exercise.cost.estimatedActiveSecondsPerSet,
      target.maximum,
    );
  }
  return exercise.cost.estimatedActiveSecondsPerSet;
}

function updateTotalSeconds(prescription: ExercisePrescriptionV1) {
  prescription.timeEstimate.totalSeconds =
    prescription.timeEstimate.setupSeconds
    + prescription.timeEstimate.transitionSeconds
    + (
      prescription.timeEstimate.activeSecondsPerSet
      * prescription.sets
    )
    + (
      prescription.restSeconds
      * Math.max(0, prescription.sets - 1)
    );
}

function buildPrescription(
  exercise: ExerciseDefinitionV1,
  prescriptionClass: PrescriptionClassDefinitionV1,
  planning: NormalizedPlanningIntakeV1,
  assignment: {
    requirementId: string;
    exerciseId: string;
    selectionPosition: number;
    sessionExercisePosition: number;
  },
): ExercisePrescriptionV1 | null {
  const classId = prescriptionClass.id;
  const outputPolicy = SESSION_PRESCRIPTION_CLASS_POLICY[classId];
  const target = targetForClass(classId, planning);
  const progressionMode = progressionForClass(classId);
  if (
    !prescriptionClass.supportedProgressionModes.includes(progressionMode)
    || !exercise.prescriptionSupport.supportedProgressionModes.includes(
      progressionMode,
    )
  ) {
    return null;
  }
  const prescription: ExercisePrescriptionV1 = {
    ...assignment,
    prescriptionClassId: classId,
    measurementType: outputPolicy.measurementType,
    sets: baselineSetCount(classId, planning),
    target,
    restSeconds: restForClass(classId, planning),
    executionMode: outputPolicy.executionMode,
    progressionMode,
    startingLoad: null,
    timeEstimate: {
      setupSeconds: exercise.cost.setupSeconds,
      activeSecondsPerSet: activeSecondsPerSet(
        exercise,
        classId,
        target,
      ),
      transitionSeconds: exercise.cost.transitionSeconds,
      totalSeconds: 0,
    },
  };
  updateTotalSeconds(prescription);
  return prescription;
}

function reduceToTimeTarget(
  prescriptions: ExercisePrescriptionV1[],
  targetSeconds: number,
) {
  const estimate = () => prescriptions.reduce(
    (sum, item) => sum + item.timeEstimate.totalSeconds,
    0,
  );
  let estimatedSeconds = estimate();
  while (estimatedSeconds > targetSeconds) {
    const reducibleIndex = prescriptions.findLastIndex((item) => (
      item.sets
      > SESSION_PRESCRIPTION_CLASS_POLICY[
        item.prescriptionClassId
      ].minimumSets
    ));
    if (reducibleIndex < 0) break;
    const prescription = prescriptions[reducibleIndex];
    prescription.sets -= 1;
    updateTotalSeconds(prescription);
    estimatedSeconds = estimate();
  }
  return estimatedSeconds;
}

function validateUpstreamInputs(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
) {
  const invalidIssues: SessionPrescriptionIssueV1[] = [];
  const planningErrors = validateNormalizedPlanningIntakeV1(planningValue);
  const catalogErrors = validateExerciseCatalogBundleV1(catalogValue);
  if (planningErrors.length > 0) {
    invalidIssues.push(issue("INTAKE_INVALID", planningErrors));
  }
  if (catalogErrors.length > 0) {
    invalidIssues.push(issue("CATALOG_INVALID", catalogErrors));
  }
  if (invalidIssues.length > 0) return invalidIssues;

  const coverageReceipt = validateCoverageCompilationV1WithReceipt(
    coverageValue,
  );
  if (!coverageReceipt.valid) {
    invalidIssues.push(issue("COVERAGE_INVALID", coverageReceipt.errors));
  } else {
    const errors = validateCoverageCompilationAgainstInputsV1(
      coverageValue,
      planningValue,
      catalogValue,
    );
    if (errors.length > 0) {
      invalidIssues.push(issue("COVERAGE_INPUT_MISMATCH", errors));
    }
  }

  const rankingReceipt = validateCandidateRankingV1WithReceipt(rankingValue);
  if (!rankingReceipt.valid) {
    invalidIssues.push(issue("RANKING_INVALID", rankingReceipt.errors));
  } else {
    const errors = validateCandidateRankingAgainstInputsV1(
      rankingValue,
      planningValue,
      catalogValue,
      coverageValue,
    );
    if (errors.length > 0) {
      invalidIssues.push(issue("RANKING_INPUT_MISMATCH", errors));
    }
  }

  const selectionReceipt = validateGlobalSelectionV1WithReceipt(
    selectionValue,
  );
  if (!selectionReceipt.valid) {
    invalidIssues.push(issue("SELECTION_INVALID", selectionReceipt.errors));
  } else {
    const errors = validateGlobalSelectionAgainstInputsV1(
      selectionValue,
      planningValue,
      catalogValue,
      coverageValue,
      rankingValue,
    );
    if (errors.length > 0) {
      invalidIssues.push(issue("SELECTION_INPUT_MISMATCH", errors));
    }
  }

  const allocationReceipt = validateSessionAllocationV1WithReceipt(
    allocationValue,
  );
  if (!allocationReceipt.valid) {
    invalidIssues.push(issue("ALLOCATION_INVALID", allocationReceipt.errors));
  } else {
    const errors = validateSessionAllocationAgainstInputsV1(
      allocationValue,
      planningValue,
      catalogValue,
      coverageValue,
      rankingValue,
      selectionValue,
    );
    if (errors.length > 0) {
      invalidIssues.push(issue("ALLOCATION_INPUT_MISMATCH", errors));
    }
  }
  return invalidIssues;
}

export function compileSessionPrescriptionV1(
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
): SessionPrescriptionV1 {
  const input = readInputIdentity(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
    allocationValue,
  );
  const invalidIssues = validateUpstreamInputs(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
    allocationValue,
  );
  if (invalidIssues.length > 0) {
    return finalize("invalid_input", input, { issues: invalidIssues });
  }

  const planning = planningValue as NormalizedPlanningIntakeV1;
  const catalog = catalogValue as ExerciseCatalogBundleV1;
  const coverage = coverageValue as CoverageCompilationV1;
  const allocation = allocationValue as SessionAllocationV1;
  if (allocation.status === "invalid_input") {
    return finalize("invalid_input", input, {
      issues: [
        issue(
          "ALLOCATION_INVALID",
          allocation.issues.map((entry) => entry.code),
        ),
      ],
    });
  }
  if (allocation.status !== "allocated") {
    return finalize("not_prescribable", input, {
      issues: [
        issue("ALLOCATION_NOT_READY", [
          allocation.status,
          coverage.status,
          ...allocation.issues.map((entry) => entry.code),
        ]),
      ],
    });
  }
  if (
    planning.goals.primary === null
    || planning.trainingBackground.experience === null
    || allocation.schedule === null
  ) {
    return finalize("invalid_input", input, {
      issues: [issue("PRESCRIPTION_CONTEXT_UNAVAILABLE")],
    });
  }

  const schedule = copySchedule(allocation.schedule);
  const exercisesById = new Map(
    catalog.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const classesById = new Map(
    catalog.prescriptionClasses.map((entry) => [entry.id, entry]),
  );
  const sessions: PrescribedSessionV1[] = [];
  const policyErrors: string[] = [];
  const missingExercises: string[] = [];
  const timeFailures: string[] = [];

  for (const allocatedSession of allocation.sessions) {
    const exercisePrescriptions: ExercisePrescriptionV1[] = [];
    for (const assignment of allocatedSession.exerciseAssignments) {
      const exercise = exercisesById.get(assignment.exerciseId);
      if (!exercise) {
        missingExercises.push(assignment.exerciseId);
        continue;
      }
      if (exercise.prescriptionSupport.prescriptionClassIds.length !== 1) {
        policyErrors.push(
          `${exercise.id}:prescription-class-count`,
        );
        continue;
      }
      const classId =
        exercise.prescriptionSupport.prescriptionClassIds[0];
      const prescriptionClass = classesById.get(classId);
      if (!prescriptionClass) {
        policyErrors.push(`${exercise.id}:${classId}`);
        continue;
      }
      const prescription = buildPrescription(
        exercise,
        prescriptionClass,
        planning,
        assignment,
      );
      if (!prescription) {
        policyErrors.push(`${exercise.id}:progression`);
        continue;
      }
      exercisePrescriptions.push(prescription);
    }
    if (missingExercises.length > 0 || policyErrors.length > 0) continue;
    const targetSeconds = schedule.sessionMinutes.target * 60;
    const hardMaximumSeconds = schedule.sessionMinutes.hardMaximum * 60;
    const estimatedSeconds = reduceToTimeTarget(
      exercisePrescriptions,
      targetSeconds,
    );
    if (estimatedSeconds > hardMaximumSeconds) {
      timeFailures.push(
        `${allocatedSession.sessionId}:${estimatedSeconds}:${hardMaximumSeconds}`,
      );
      continue;
    }
    sessions.push({
      sessionId: allocatedSession.sessionId,
      ordinal: allocatedSession.ordinal,
      weekday: allocatedSession.weekday,
      exercisePrescriptions,
      timeBudget: {
        targetSeconds,
        hardMaximumSeconds,
        estimatedSeconds,
        status:
          estimatedSeconds <= targetSeconds
            ? "within_target"
            : "within_hard_maximum",
      },
    });
  }

  if (missingExercises.length > 0) {
    return finalize("invalid_input", input, {
      issues: [issue("CATALOG_EXERCISE_MISSING", missingExercises)],
    });
  }
  if (policyErrors.length > 0) {
    return finalize("invalid_input", input, {
      issues: [issue("PRESCRIPTION_POLICY_UNSUPPORTED", policyErrors)],
    });
  }
  if (timeFailures.length > 0) {
    return finalize("infeasible", input, {
      schedule,
      issues: [issue("TIME_BUDGET_EXCEEDED", timeFailures)],
    });
  }

  const prescriptions = sessions.flatMap(
    (session) => session.exercisePrescriptions,
  );
  const summary: SessionPrescriptionSummaryV1 = {
    sessionCount: sessions.length,
    exerciseCount: prescriptions.length,
    totalSets: prescriptions.reduce((sum, item) => sum + item.sets, 0),
    totalEstimatedSeconds: sessions.reduce(
      (sum, session) => sum + session.timeBudget.estimatedSeconds,
      0,
    ),
    withinTargetSessionCount: sessions.filter(
      (session) => session.timeBudget.status === "within_target",
    ).length,
    withinHardMaximumSessionCount: sessions.filter(
      (session) => (
        session.timeBudget.estimatedSeconds
        <= session.timeBudget.hardMaximumSeconds
      ),
    ).length,
  };
  return finalize("prescribed", input, {
    schedule,
    sessions,
    summary,
  });
}

export function validateSessionPrescriptionAgainstInputsV1(
  value: unknown,
  planningValue: unknown,
  catalogValue: unknown,
  coverageValue: unknown,
  rankingValue: unknown,
  selectionValue: unknown,
  allocationValue: unknown,
) {
  const receipt = validateSessionPrescriptionV1WithReceipt(value);
  const errors = [...receipt.errors];
  if (errors.length > 0) return errors;
  const supplied = value as SessionPrescriptionV1;
  const expected = compileSessionPrescriptionV1(
    planningValue,
    catalogValue,
    coverageValue,
    rankingValue,
    selectionValue,
    allocationValue,
  );
  if (supplied.prescriptionDigest !== expected.prescriptionDigest) {
    errors.push(
      "$.prescriptionDigest does not match recompilation from the supplied planning, catalog, coverage, ranking, selection, and allocation inputs.",
    );
  }
  return errors;
}
