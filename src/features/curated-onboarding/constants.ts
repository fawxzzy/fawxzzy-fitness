import type {
  CardioPreference,
  CuratedOnboardingData,
  CuratedStepId,
  EquipmentAccess,
  ExperienceLevel,
  PreferredStyle,
  TrainingGoal,
} from "./types.ts";

export const CURATED_ONBOARDING_DRAFT_VERSION = 2 as const;
export const CURATED_ONBOARDING_PRIMARY_DRAFT_ID = "curated-primary";
export const CURATED_ONBOARDING_STORAGE_PREFIX = "fawxzzy:curated-onboarding:v1";

export const CURATED_STEP_ORDER: CuratedStepId[] = [
  "intro",
  "goals",
  "experience",
  "equipment",
  "schedule",
  "preferences",
  "constraints",
  "review",
  "generation-handoff",
];

export const EMPTY_CURATED_ONBOARDING_DATA: CuratedOnboardingData = {
  trainingGoal: null,
  experience: null,
  daysPerWeek: null,
  sessionLengthMinutes: null,
  equipment: [],
  preferredStyle: null,
  cardioPreference: null,
  limitations: "",
  exerciseLikes: [],
  exerciseDislikes: [],
  targetAreas: [],
};

export const TRAINING_GOAL_OPTIONS: Array<{ value: TrainingGoal; label: string; description: string }> = [
  { value: "build-muscle", label: "Build Muscle", description: "Bias size, volume, and steady progression." },
  { value: "get-leaner", label: "Get Leaner", description: "Keep lifting while supporting body-composition work." },
  { value: "get-stronger", label: "Get Stronger", description: "Bias heavier work and strength-focused progression." },
  { value: "general-fitness", label: "General Fitness", description: "Blend strength, movement, and consistency." },
];

export const EXPERIENCE_LEVEL_OPTIONS: Array<{ value: ExperienceLevel; label: string; description: string }> = [
  { value: "beginner", label: "Beginner", description: "New to lifting or returning after a long break." },
  { value: "intermediate", label: "Intermediate", description: "Comfortable training on your own with consistent reps." },
  { value: "advanced", label: "Advanced", description: "Experienced lifter with established training habits." },
];

export const EQUIPMENT_ACCESS_OPTIONS: Array<{ value: EquipmentAccess; label: string }> = [
  { value: "full-gym", label: "Full Gym" },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "machines", label: "Machines" },
  { value: "bands", label: "Bands" },
  { value: "bodyweight", label: "Bodyweight" },
];

export const PREFERRED_STYLE_OPTIONS: Array<{ value: PreferredStyle; label: string; description: string }> = [
  { value: "full-body", label: "Full Body", description: "Hit the full body across fewer sessions." },
  { value: "upper-lower", label: "Upper / Lower", description: "Alternate upper and lower training days." },
  { value: "push-pull-legs", label: "PPL", description: "Organize days around movement families." },
  { value: "hybrid", label: "Hybrid", description: "Blend lifting with conditioning or sport support." },
];

export const CARDIO_PREFERENCE_OPTIONS: Array<{ value: CardioPreference; label: string; description: string }> = [
  { value: "minimal", label: "Minimal", description: "Keep cardio light and out of the way." },
  { value: "balanced", label: "Balanced", description: "Mix cardio work in without dominating the week." },
  { value: "focus", label: "Cardio Focus", description: "Treat cardio as a meaningful part of the plan." },
];

export const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6] as const;
export const SESSION_LENGTH_OPTIONS = [30, 45, 60, 75] as const;

export const CURATED_INTRO_CARDS = [
  {
    title: "Tell us your setup",
    body: "Goals, schedule, equipment, and preferences.",
  },
  {
    title: "We shape the plan",
    body: "The curated engine will build a routine around your inputs.",
  },
  {
    title: "You stay in control",
    body: "You will still be able to edit exercises, days, and progression.",
  },
] as const;
