import { digestCanonicalJson } from "./canonical.ts";
import type {
  NormalizedPlanningIntakeV1,
  PlanningGenerationProjectionV1,
} from "./contract.ts";

type PlanningIntakeWithoutDigest = Omit<
  NormalizedPlanningIntakeV1,
  "generationProjectionDigest"
>;

function toSemanticIssue({
  sourceQuestionIds: _sourceQuestionIds,
  ...issue
}: PlanningIntakeWithoutDigest["normalizationIssues"][number]) {
  return issue;
}

export function buildPlanningGenerationProjection(
  input: PlanningIntakeWithoutDigest,
): PlanningGenerationProjectionV1 {
  const {
    preferredTrainingTime: _preferredTrainingTime,
    ...schedule
  } = input.schedule;
  const {
    knownPerformanceContext: _knownPerformanceContext,
    ...trainingBackground
  } = input.trainingBackground;
  const {
    unresolvedItems,
    acknowledgments: _acknowledgments,
    ...safetyWithoutIssues
  } = input.safety;

  return {
    contractVersion: input.contractVersion,
    normalizerVersion: input.source.normalizerVersion,
    blockingIssues: input.normalizationIssues.filter(
      (issue) => issue.severity === "blocking",
    ).map(toSemanticIssue),
    schedule,
    goals: input.goals,
    trainingBackground,
    environment: input.environment,
    recovery: input.recovery,
    safety: {
      ...safetyWithoutIssues,
      unresolvedItems: unresolvedItems.map(toSemanticIssue),
    },
    preferences: input.preferences,
  };
}

export function digestPlanningGenerationProjection(
  input: PlanningIntakeWithoutDigest,
) {
  return digestCanonicalJson(buildPlanningGenerationProjection(input));
}
