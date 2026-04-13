import {
  CARDIO_PREFERENCE_OPTIONS,
  CURATED_STEP_ORDER,
  EXPERIENCE_LEVEL_OPTIONS,
  PREFERRED_STYLE_OPTIONS,
  TRAINING_GOAL_OPTIONS,
} from "./constants.ts";
import type { CuratedOnboardingData, CuratedOnboardingDraft, CuratedStepId } from "./types.ts";

function findOptionLabel<T extends string>(value: T | null | undefined, options: Array<{ value: T; label: string }>) {
  return options.find((option) => option.value === value)?.label ?? "Not set";
}

export function getCuratedStepIndex(stepId: CuratedStepId) {
  return Math.max(CURATED_STEP_ORDER.indexOf(stepId), 0);
}

export function getCuratedProgressValue(stepId: CuratedStepId) {
  return Math.round(((getCuratedStepIndex(stepId) + 1) / CURATED_STEP_ORDER.length) * 100);
}

export function canGoBackCuratedStep(stepId: CuratedStepId) {
  return getCuratedStepIndex(stepId) > 0 && stepId !== "generation-handoff";
}

export function isCuratedOnboardingReadyForHandoff(data: CuratedOnboardingData) {
  return Boolean(
    data.trainingGoal
    && data.experience
    && data.equipment.length > 0
    && data.daysPerWeek
    && data.sessionLengthMinutes
    && data.preferredStyle
    && data.cardioPreference,
  );
}

export function hasCuratedOnboardingProgress(draft: CuratedOnboardingDraft) {
  if (getCuratedStepIndex(draft.stepId) > 0) {
    return true;
  }

  const { data } = draft;

  return Boolean(
    data.trainingGoal
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
  if (stepId === "intro" || stepId === "constraints" || stepId === "generation-handoff") {
    return true;
  }

  if (stepId === "goals") {
    return Boolean(data.trainingGoal);
  }

  if (stepId === "experience") {
    return Boolean(data.experience);
  }

  if (stepId === "equipment") {
    return data.equipment.length > 0;
  }

  if (stepId === "schedule") {
    return Boolean(data.daysPerWeek && data.sessionLengthMinutes);
  }

  if (stepId === "preferences") {
    return Boolean(data.preferredStyle && data.cardioPreference);
  }

  return isCuratedOnboardingReadyForHandoff(data);
}

export function getCuratedStepBlockingMessage(stepId: CuratedStepId) {
  if (stepId === "goals") return "Choose the training goal that should lead the routine.";
  if (stepId === "experience") return "Choose the experience level that matches your current baseline.";
  if (stepId === "equipment") return "Choose at least one equipment setup.";
  if (stepId === "schedule") return "Set both weekly training days and session length.";
  if (stepId === "preferences") return "Set both the split preference and cardio preference.";
  if (stepId === "review") return "Complete the required setup inputs before saving the intake.";
  return null;
}

export function getCuratedReviewSections(data: CuratedOnboardingDraft["data"]) {
  return [
    {
      title: "Training goal",
      value: findOptionLabel(data.trainingGoal, TRAINING_GOAL_OPTIONS),
    },
    {
      title: "Experience",
      value: findOptionLabel(data.experience, EXPERIENCE_LEVEL_OPTIONS),
    },
    {
      title: "Schedule",
      value:
        data.daysPerWeek && data.sessionLengthMinutes
          ? `${data.daysPerWeek} days per week - ${data.sessionLengthMinutes} minutes`
          : "Not set",
    },
    {
      title: "Equipment",
      value: data.equipment.length > 0 ? data.equipment.join(", ") : "Not set",
    },
    {
      title: "Preferred style",
      value: findOptionLabel(data.preferredStyle, PREFERRED_STYLE_OPTIONS),
    },
    {
      title: "Cardio preference",
      value: findOptionLabel(data.cardioPreference, CARDIO_PREFERENCE_OPTIONS),
    },
    {
      title: "Limitations",
      value: data.limitations?.trim() || "None logged",
    },
    {
      title: "Exercise likes",
      value: data.exerciseLikes.length > 0 ? data.exerciseLikes.join(", ") : "None logged",
    },
    {
      title: "Exercise dislikes",
      value: data.exerciseDislikes.length > 0 ? data.exerciseDislikes.join(", ") : "None logged",
    },
    {
      title: "Target areas",
      value: data.targetAreas.length > 0 ? data.targetAreas.join(", ") : "None logged",
    },
  ];
}
