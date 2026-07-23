import { CURATED_FORM_STEP_ORDER, CURATED_STEP_ORDER } from "./constants.ts";
import {
  CURATED_INTAKE_SECTIONS,
  formatCuratedResponse,
  getMissingRequiredQuestionIds,
  isCuratedQuestionVisible,
} from "./questionnaire.ts";
import type { CuratedOnboardingData, CuratedOnboardingDraft, CuratedStepId } from "./types.ts";

export type CuratedRoutineMenuOption = {
  href: string;
  label: "Build for me" | "Resume build";
};

export function getCuratedStepIndex(stepId: CuratedStepId) {
  return Math.max(CURATED_STEP_ORDER.indexOf(stepId), 0);
}

export function getCuratedProgressValue(stepId: CuratedStepId) {
  if (stepId === "generation-handoff") return 100;
  const formIndex = Math.max(CURATED_FORM_STEP_ORDER.indexOf(stepId), 0);
  return Math.round(((formIndex + 1) / CURATED_FORM_STEP_ORDER.length) * 100);
}

export function canGoBackCuratedStep(stepId: CuratedStepId) {
  return getCuratedStepIndex(stepId) > 0 && stepId !== "generation-handoff";
}

export function resolveCuratedRoutineMenuOption(args: {
  enabled: boolean;
  savedDraftId: string | null;
}): CuratedRoutineMenuOption | null {
  if (!args.enabled) return null;

  const savedDraftId = args.savedDraftId?.trim();
  if (!savedDraftId) {
    return {
      href: "/curated-onboarding",
      label: "Build for me",
    };
  }

  return {
    href: `/curated-onboarding?draft=${encodeURIComponent(savedDraftId)}`,
    label: "Resume build",
  };
}

export function isCuratedOnboardingReadyForHandoff(data: CuratedOnboardingData) {
  const questionnaireComplete = CURATED_INTAKE_SECTIONS.every(
    (section) => getMissingRequiredQuestionIds(section.stepId, data.intakeResponses).length === 0,
  );

  return Boolean(
    questionnaireComplete
    && data.trainingGoal
    && data.experience
    && data.equipment.length > 0
    && data.daysPerWeek
    && data.sessionLengthMinutes
    && data.preferredStyle
    && data.cardioPreference,
  );
}

export function hasCuratedOnboardingProgress(draft: CuratedOnboardingDraft) {
  if (getCuratedStepIndex(draft.stepId) > 0) return true;

  const { data } = draft;
  return Boolean(
    Object.values(data.intakeResponses).some((value) =>
      value === true
      || (typeof value === "string" && value.trim().length > 0)
      || (Array.isArray(value) && value.length > 0),
    )
    || data.trainingGoal
    || data.experience
    || data.daysPerWeek
    || data.sessionLengthMinutes
    || data.equipment.length > 0
    || data.preferredStyle
    || data.cardioPreference
    || data.limitations?.trim()
    || data.exerciseLikes.length > 0
    || data.exerciseDislikes.length > 0
    || data.targetAreas.length > 0,
  );
}

export function canAdvanceCuratedStep(stepId: CuratedStepId, data: CuratedOnboardingData) {
  if (stepId === "generation-handoff") return true;
  if (stepId === "review") return isCuratedOnboardingReadyForHandoff(data);
  return getMissingRequiredQuestionIds(stepId, data.intakeResponses).length === 0;
}

export function canAccessCuratedStep(stepId: CuratedStepId, data: CuratedOnboardingData) {
  if (stepId === "generation-handoff") return false;

  const targetIndex = getCuratedStepIndex(stepId);
  return CURATED_FORM_STEP_ORDER
    .slice(0, targetIndex)
    .every((previousStepId) => canAdvanceCuratedStep(previousStepId, data));
}

export function getCuratedStepBlockingMessage(stepId: CuratedStepId) {
  if (stepId === "review") return "Complete each required question before generating the routine.";
  if (stepId === "generation-handoff") return null;
  return "Answer each required question on this page to continue.";
}

export function getCuratedReviewSections(data: CuratedOnboardingDraft["data"]) {
  return CURATED_INTAKE_SECTIONS.map((section) => ({
    stepId: section.stepId,
    title: section.title,
    complete: getMissingRequiredQuestionIds(section.stepId, data.intakeResponses).length === 0,
    answers: section.questions
      .filter((question) => isCuratedQuestionVisible(question, data.intakeResponses))
      .map((question) => ({
        id: question.id,
        label: question.label,
        value: formatCuratedResponse(question, data.intakeResponses),
      })),
  }));
}
