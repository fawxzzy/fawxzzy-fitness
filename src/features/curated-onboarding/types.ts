export type CuratedStepId =
  | "intro"
  | "goals"
  | "experience"
  | "equipment"
  | "schedule"
  | "preferences"
  | "constraints"
  | "nutrition"
  | "delivery"
  | "review"
  | "generation-handoff";

export type TrainingGoal = "build-muscle" | "get-leaner" | "get-stronger" | "general-fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentAccess = "full-gym" | "barbell" | "dumbbells" | "machines" | "bands" | "bodyweight";
export type PreferredStyle = "full-body" | "upper-lower" | "push-pull-legs" | "hybrid";
export type CardioPreference = "minimal" | "balanced" | "focus";
export type CuratedIntakeStatus = "draft" | "completed";
export type CuratedGenerationStatus = "idle" | "not-implemented" | "queued" | "ready" | "failed";
export type CuratedIntakeResponse = string | string[] | boolean;
export type CuratedIntakeResponses = Record<string, CuratedIntakeResponse>;

export type CuratedQuestionType = "short-text" | "long-text" | "single" | "multi" | "acknowledgment";

export interface CuratedQuestionOption {
  value: string;
  label: string;
}

export interface CuratedQuestionDefinition {
  id: string;
  label: string;
  type: CuratedQuestionType;
  required?: boolean;
  options?: readonly CuratedQuestionOption[];
  allowOther?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}

export interface CuratedSectionNotice {
  afterQuestionId: string;
  title: string;
  body: string;
  tone: "warning" | "danger";
}

export interface CuratedIntakeSection {
  stepId: Exclude<CuratedStepId, "review" | "generation-handoff">;
  title: string;
  description?: string;
  questions: readonly CuratedQuestionDefinition[];
  notices?: readonly CuratedSectionNotice[];
}

export interface CuratedOnboardingData {
  intakeResponses: CuratedIntakeResponses;
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
  version: 3;
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
