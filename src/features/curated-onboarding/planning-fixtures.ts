import type {
  CuratedIntakeResponses,
  CuratedOnboardingData,
} from "./types.ts";

export const BEGINNER_PLANET_FITNESS_4_DAY_MUSCLE_GAIN_FIXTURE_ID =
  "beginner-planet-fitness-4day-muscle-gain" as const;

function beginnerPlanetFitnessResponses(
  overrides: CuratedIntakeResponses = {},
): CuratedIntakeResponses {
  return {
    email: "fixture@example.com",
    name: "Fixture User",
    under18: "no",
    mainGoals: ["build-muscle", "get-stronger", "consistency"],
    primaryGoal: "Build muscle",
    topThreeGoals: "Build muscle\nGet stronger\nStay consistent",
    areasToImprove: ["overall", "legs", "back"],
    biggestStruggles: ["exercise-selection", "progression"],
    trainingExperience: "under-3-months",
    currentRoutine: "No consistent routine",
    currentSplit: "N/A",
    tracksWorkouts: "no",
    trainingDaysPerWeek: "4",
    workoutLength: "30-45",
    preferredTrainingDays: ["tue", "thu", "sat", "sun"],
    trainingTime: "evening",
    outsideActivity: "lightly-active",
    sleepHours: "7-8",
    trainingLocations: ["planet-fitness"],
    availableEquipment: [
      "dumbbells",
      "smith-machine",
      "cables",
      "machines",
      "treadmill",
      "bodyweight",
    ],
    heaviestDumbbells: "75 lbs",
    equipmentAvoid: "N/A",
    hasPainOrLimitations: "no",
    exercisesCannotDo: "N/A",
    uncomfortableExercises: "N/A",
    professionalRestrictions: "no",
    warningSymptoms: ["none"],
    medicalConditions: "N/A",
    medications: "no",
    safetyAcknowledgment: true,
    exerciseEnjoy: "Leg press, dumbbell bench press",
    exerciseHate: "N/A",
    movementsToImprove: ["bench-press", "squat"],
    planStyle: "muscle-focused",
    equipmentPreference: "machines",
    nutritionDirection: "bulk",
    nutritionHelp: ["protein", "meals"],
    foodRestrictions: "N/A",
    planContents: ["weekly-split", "sets-reps", "progression", "substitutions"],
    planDetail: "medium",
    deliveryMethod: "app",
    fitnessGuidanceAcknowledgment: true,
    ...overrides,
  };
}

export function createBeginnerPlanetFitness4DayMuscleGainFixture(
  responseOverrides: CuratedIntakeResponses = {},
): CuratedOnboardingData {
  return {
    intakeResponses: beginnerPlanetFitnessResponses(responseOverrides),
    trainingGoal: "build-muscle",
    experience: "beginner",
    daysPerWeek: 4,
    sessionLengthMinutes: 45,
    equipment: ["full-gym", "dumbbells", "machines", "bodyweight"],
    preferredStyle: "push-pull-legs",
    cardioPreference: "balanced",
    limitations: "",
    exerciseLikes: ["Leg Press", "Dumbbell Bench Press"],
    exerciseDislikes: [],
    targetAreas: ["overall", "legs", "back"],
  };
}
