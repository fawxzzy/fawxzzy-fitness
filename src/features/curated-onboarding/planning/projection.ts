import { digestCanonicalJson } from "./canonical.ts";
import type {
  NormalizedPlanningIntakeV1,
  PlanningGenerationProjectionV1,
} from "./contract.ts";

type PlanningIntakeWithoutDigest = Omit<
  NormalizedPlanningIntakeV1,
  "generationProjectionDigest"
>;

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
    acknowledgments: _acknowledgments,
    ...safety
  } = input.safety;

  return {
    contractVersion: input.contractVersion,
    normalizerVersion: input.source.normalizerVersion,
    blockingIssues: input.normalizationIssues.filter(
      (issue) => issue.severity === "blocking",
    ),
    schedule,
    goals: input.goals,
    trainingBackground,
    environment: input.environment,
    recovery: input.recovery,
    safety,
    preferences: input.preferences,
  };
}

export function digestPlanningGenerationProjection(
  input: PlanningIntakeWithoutDigest,
) {
  return digestCanonicalJson(buildPlanningGenerationProjection(input));
}
