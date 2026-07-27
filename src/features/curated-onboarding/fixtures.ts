import {
  CURATED_ONBOARDING_DRAFT_VERSION,
  CURATED_ONBOARDING_PRIMARY_DRAFT_ID,
  EMPTY_CURATED_ONBOARDING_DATA,
} from "./constants.ts";
import type { CuratedOnboardingData, CuratedOnboardingDraft, CuratedOnboardingState } from "./types.ts";

export function createEmptyCuratedOnboardingData(): CuratedOnboardingData {
  return {
    ...EMPTY_CURATED_ONBOARDING_DATA,
    intakeResponses: { ...EMPTY_CURATED_ONBOARDING_DATA.intakeResponses },
    equipment: [...EMPTY_CURATED_ONBOARDING_DATA.equipment],
    exerciseLikes: [...EMPTY_CURATED_ONBOARDING_DATA.exerciseLikes],
    exerciseDislikes: [...EMPTY_CURATED_ONBOARDING_DATA.exerciseDislikes],
    targetAreas: [...EMPTY_CURATED_ONBOARDING_DATA.targetAreas],
  };
}

export function createCuratedOnboardingDraft(overrides: Partial<CuratedOnboardingDraft> = {}): CuratedOnboardingDraft {
  const baseData = createEmptyCuratedOnboardingData();
  const { data: overrideData, ...draftOverrides } = overrides;

  return {
    version: CURATED_ONBOARDING_DRAFT_VERSION,
    draftId: CURATED_ONBOARDING_PRIMARY_DRAFT_ID,
    stepId: "intro",
    updatedAt: new Date(0).toISOString(),
    data: {
      ...baseData,
      ...(overrideData ?? {}),
      intakeResponses: { ...baseData.intakeResponses, ...(overrideData?.intakeResponses ?? {}) },
      equipment: [...(overrideData?.equipment ?? baseData.equipment)],
      exerciseLikes: [...(overrideData?.exerciseLikes ?? baseData.exerciseLikes)],
      exerciseDislikes: [...(overrideData?.exerciseDislikes ?? baseData.exerciseDislikes)],
      targetAreas: [...(overrideData?.targetAreas ?? baseData.targetAreas)],
    },
    ...draftOverrides,
  };
}

export function createCuratedOnboardingState(overrides: Partial<CuratedOnboardingState> = {}): CuratedOnboardingState {
  return {
    draft: createCuratedOnboardingDraft(overrides.draft),
    lifecycle: {
      intakeStatus: "draft",
      generationStatus: "idle",
      planId: null,
      completedAt: null,
      ...(overrides.lifecycle ?? {}),
    },
    message: null,
    ...(overrides.message ? { message: overrides.message } : {}),
  };
}
