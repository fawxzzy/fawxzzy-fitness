import {
  CURATED_INTAKE_INCOMPLETE_MESSAGE,
  resolveCuratedWorkoutPlan,
  type CuratedHistorySignals,
  type CuratedPlanResult,
  type CuratedWorkoutPlan,
} from "./engine.ts";
import {
  CURATED_QUESTIONS,
  deriveCuratedEngineData,
  removeHiddenCuratedResponses,
} from "./questionnaire.ts";
import { isCuratedOnboardingReadyForHandoff } from "./selectors.ts";
import {
  CURATED_CREATE_FAILED_MESSAGE,
  CURATED_CREATE_PARTIAL_MESSAGE,
  CURATED_DISABLED_MESSAGE,
  CURATED_PLAN_CHANGED_MESSAGE,
  CURATED_UNAVAILABLE_MESSAGE,
} from "./copy.ts";
import type { CuratedIntakeResponse, CuratedIntakeResponses, CuratedOnboardingData } from "./types.ts";

/**
 * The one typed boundary between the curated onboarding intake and the curated workout engine.
 *
 * - The client sends the raw `intakeResponses` (plus whatever derived fields it holds).
 * - The server treats ONLY `intakeResponses` as input: it validates their shape, drops unknown keys and
 *   hidden answers, and re-derives every engine field (goal, experience, days, session length, equipment,
 *   avoided equipment, style, limitations, likes, dislikes, target areas) itself. Client-supplied derived
 *   fields are ignored, so the engine input is always reproducible from the saved intake.
 * - The outcome is a closed union. A generation attempt is `ready`, `blocked`, `failed`, or `plan-changed`.
 *   A fabricated or partial routine is not an outcome.
 */
export {
  CURATED_CREATE_FAILED_MESSAGE,
  CURATED_CREATE_PARTIAL_MESSAGE,
  CURATED_DISABLED_MESSAGE,
  CURATED_PLAN_CHANGED_MESSAGE,
  CURATED_UNAVAILABLE_MESSAGE,
};

export const CURATED_GENERATION_CONTRACT_VERSION = 1 as const;

export interface CuratedWorkoutGenerationRequest {
  /** Untrusted payload from the browser; parsed by `parseCuratedOnboardingPayload`. */
  onboarding: unknown;
  /** Recent-history signals loaded server-side, or null for first-time members. */
  signals: CuratedHistorySignals | null;
  /** Plan id the member reviewed. When set and different from the regenerated plan, nothing is created. */
  expectedPlanId?: string | null;
}

export type CuratedWorkoutGenerationOutcome =
  | CuratedPlanResult
  | { status: "plan-changed"; plan: CuratedWorkoutPlan; expectedPlanId: string; message: string }
  | { status: "failed"; reason: "invalid-request"; message: string };

export type CuratedGenerationFailureCode =
  | "safety-clearance-required"
  | "guardian-permission-required"
  | "feature-disabled"
  | "incomplete-intake"
  | "no-safe-plan"
  | "invalid-request"
  | "plan-changed"
  | "unavailable";

const MAX_RESPONSE_TEXT_LENGTH = 4000;
const MAX_RESPONSE_LIST_LENGTH = 60;

const KNOWN_RESPONSE_KEYS = new Set<string>(
  CURATED_QUESTIONS.flatMap((question) => [question.id, `${question.id}Other`]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResponse(value: unknown): CuratedIntakeResponse | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.length <= MAX_RESPONSE_TEXT_LENGTH ? value : null;
  }
  if (Array.isArray(value) && value.length <= MAX_RESPONSE_LIST_LENGTH) {
    return value.every((entry) => typeof entry === "string" && entry.length <= MAX_RESPONSE_TEXT_LENGTH)
      ? (value as string[])
      : null;
  }
  return null;
}

/**
 * Validates an untrusted onboarding payload and rebuilds the engine input from `intakeResponses` alone.
 * Returns null for anything that is not a plain object with a well-formed `intakeResponses` map.
 */
export function parseCuratedOnboardingPayload(value: unknown): CuratedOnboardingData | null {
  if (!isRecord(value) || !isRecord(value.intakeResponses)) return null;

  const intakeResponses: CuratedIntakeResponses = {};
  for (const key of Object.keys(value.intakeResponses).sort()) {
    if (!KNOWN_RESPONSE_KEYS.has(key)) continue;
    const parsed = parseResponse(value.intakeResponses[key]);
    if (parsed === null) return null;
    intakeResponses[key] = parsed;
  }

  const visibleResponses = removeHiddenCuratedResponses(intakeResponses);
  return {
    ...deriveCuratedEngineData(visibleResponses),
    intakeResponses: visibleResponses,
  };
}

/** Pure, database-free compile step shared by the preview and create server actions. */
export function compileCuratedWorkoutGeneration(
  request: CuratedWorkoutGenerationRequest,
): CuratedWorkoutGenerationOutcome {
  const onboarding = parseCuratedOnboardingPayload(request.onboarding);
  if (!onboarding) {
    return {
      status: "failed",
      reason: "invalid-request",
      message: "The saved setup could not be read. Review your setup and try again.",
    };
  }

  // Fail closed server-side: every required answer (including the safety questions and acknowledgment) must be
  // present and well-typed before the generator runs, whatever the browser claims about its own progress.
  if (!isCuratedOnboardingReadyForHandoff(onboarding)) {
    return { status: "failed", reason: "incomplete-intake", message: CURATED_INTAKE_INCOMPLETE_MESSAGE };
  }

  const result = resolveCuratedWorkoutPlan(onboarding, request.signals);
  if (result.status !== "ready") return result;

  if (request.expectedPlanId && request.expectedPlanId !== result.plan.planId) {
    return {
      status: "plan-changed",
      plan: result.plan,
      expectedPlanId: request.expectedPlanId,
      message: CURATED_PLAN_CHANGED_MESSAGE,
    };
  }

  return result;
}

/** Stable code plus user-safe message for every outcome that is not `ready`. */
export function toCuratedGenerationFailure(
  outcome: Exclude<CuratedWorkoutGenerationOutcome, { status: "ready" }>,
): { code: CuratedGenerationFailureCode; error: string } {
  if (outcome.status === "plan-changed") {
    return { code: "plan-changed", error: outcome.message };
  }
  return { code: outcome.reason, error: outcome.message };
}
