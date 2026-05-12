export type CuratedStepId =
  | "intro"
  | "goals"
  | "experience"
  | "equipment"
  | "schedule"
  | "preferences"
  | "constraints"
  | "review"
  | "generation-handoff";

export type TrainingGoal = "build-muscle" | "get-leaner" | "get-stronger" | "general-fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentAccess = "full-gym" | "barbell" | "dumbbells" | "machines" | "bands" | "bodyweight";
export type PreferredStyle = "full-body" | "upper-lower" | "push-pull-legs" | "hybrid";
export type CardioPreference = "minimal" | "balanced" | "focus";
export type CuratedIntakeStatus = "draft" | "completed";
export type CuratedGenerationStatus = "idle" | "not-implemented" | "queued" | "ready" | "failed";

export interface CuratedOnboardingData {
  trainingGoal?: TrainingGoal | null;
  experience?: ExperienceLevel | null;
  daysPerWeek?: number | null;
  sessionLengthMinutes?: number | null;
  equipment: EquipmentAccess[];
  preferredStyle?: PreferredStyle | null;
  cardioPreference?: CardioPreference | null;
  limitations?: string;
  exerciseLikes: string[];
  exerciseDislikes: string[];
  targetAreas: string[];
}

export interface CuratedOnboardingDraft {
  version: 2;
  draftId: string;
  stepId: CuratedStepId;
  updatedAt: string;
  data: CuratedOnboardingData;
}

export interface CuratedOnboardingLifecycleState {
  intakeStatus: CuratedIntakeStatus;
  generationStatus: CuratedGenerationStatus;
  planId: string | null;
  completedAt: string | null;
}

export interface CuratedOnboardingState {
  draft: CuratedOnboardingDraft;
  lifecycle: CuratedOnboardingLifecycleState;
  message: string | null;
}

export interface CuratedOnboardingGateState {
  hasCompletedCuratedIntake: boolean;
  hasSeenInitialExperience: boolean;
  savedCuratedDraftId: string | null;
  intakeStatus: CuratedIntakeStatus;
  generationStatus: CuratedGenerationStatus;
}
