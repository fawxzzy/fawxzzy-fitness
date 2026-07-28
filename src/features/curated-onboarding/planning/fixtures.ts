import { createCuratedOnboardingDraft } from "../fixtures.ts";
import {
  createCuratedParityFixture,
  removeHiddenCuratedResponses,
} from "../questionnaire.ts";
import type {
  CuratedIntakeResponses,
  CuratedOnboardingData,
} from "../types.ts";
import type { NormalizedPlanningIntakeV1, Weekday } from "./contract.ts";
import { normalizeCuratedPlanningIntake } from "./normalize.ts";

export const NORMALIZED_PLANNING_FIXTURE_IDS = [
  "beginner-home-3day-general-strength",
  "beginner-planet-fitness-4day-muscle-gain",
  "intermediate-freeweights-5day-strength",
  "time-limited-3day-30min",
  "bodyweight-travel-4day-general-fitness",
  "cardio-priority-4day-hybrid",
  "lower-emphasis-4day-secondary-upper",
  "no-overhead-3day-substitution",
  "ambiguous-warning-blocked",
  "pullup-priority-no-pull-equipment",
] as const;

export type NormalizedPlanningFixtureId = typeof NORMALIZED_PLANNING_FIXTURE_IDS[number];

type FixtureDefinition = {
  responseOverrides: CuratedIntakeResponses;
  expected: {
    blocked: boolean;
    daysPerWeek: number;
    weekdays: Weekday[];
    primaryGoal: string;
  };
};

function baseResponses(overrides: CuratedIntakeResponses): CuratedIntakeResponses {
  return removeHiddenCuratedResponses({
    ...createCuratedParityFixture("standard"),
    email: "planning-fixture@example.com",
    name: "Planning Fixture",
    contactMethod: "N/A",
    socialUsername: "N/A",
    under18: "no",
    mainGoals: ["consistency", "gym-confidence"],
    primaryGoal: "General fitness",
    topThreeGoals: "General fitness\nBuild consistency\nMove well",
    areasToImprove: ["overall"],
    biggestStruggles: ["exercise-selection", "progression"],
    height: "5 ft 10 in",
    currentWeight: "180 lbs",
    weightDirection: "maintain",
    trainingExperience: "under-3-months",
    currentRoutine: "No consistent routine",
    currentSplit: "N/A",
    tracksWorkouts: "no",
    trainingDaysPerWeek: "3",
    workoutLength: "45-60",
    preferredTrainingDays: ["mon", "wed", "fri"],
    trainingTime: "evening",
    outsideActivity: "lightly-active",
    sleepHours: "7-8",
    trainingLocations: ["home-gym"],
    availableEquipment: ["dumbbells", "bench", "resistance-bands", "bodyweight"],
    heaviestDumbbells: "50 lbs",
    equipmentAvoid: "N/A",
    hasPainOrLimitations: "no",
    exercisesCannotDo: "N/A",
    uncomfortableExercises: "N/A",
    professionalRestrictions: "no",
    warningSymptoms: ["none"],
    medicalConditions: "N/A",
    medications: "no",
    safetyAcknowledgment: true,
    exerciseEnjoy: "Goblet squat, dumbbell row",
    exerciseHate: "N/A",
    movementsToImprove: ["squat", "rows"],
    planStyle: "simple-repeatable",
    equipmentPreference: "mix",
    tracksFood: "no",
    tracksProtein: "no",
    eatingPattern: "consistent",
    foodRestrictions: "N/A",
    nutritionDirection: "habits",
    nutritionHelp: ["protein"],
    planContents: ["weekly-split", "sets-reps", "progression", "substitutions"],
    planDetail: "medium",
    deliveryMethod: "app",
    followUpConsent: "yes",
    testimonialConsent: "no",
    accuracyAcknowledgment: true,
    fitnessGuidanceAcknowledgment: true,
    ...overrides,
  });
}

const FIXTURE_DEFINITIONS: Record<NormalizedPlanningFixtureId, FixtureDefinition> = {
  "beginner-home-3day-general-strength": {
    responseOverrides: {
      mainGoals: ["get-stronger", "consistency"],
      primaryGoal: "Get stronger",
      topThreeGoals: "Get stronger\nGeneral fitness\nBuild consistency",
      trainingDaysPerWeek: "3",
      workoutLength: "other",
      workoutLengthOther: "50",
      preferredTrainingDays: ["mon", "wed", "fri"],
      trainingLocations: ["home-gym"],
      availableEquipment: ["dumbbells", "bench", "resistance-bands", "bodyweight"],
    },
    expected: {
      blocked: false,
      daysPerWeek: 3,
      weekdays: ["monday", "wednesday", "friday"],
      primaryGoal: "get_stronger",
    },
  },
  "beginner-planet-fitness-4day-muscle-gain": {
    responseOverrides: {
      mainGoals: ["build-muscle", "get-stronger", "consistency"],
      primaryGoal: "Build muscle",
      topThreeGoals: "Build muscle\nGet stronger\nStay consistent",
      areasToImprove: ["overall", "legs", "back"],
      trainingDaysPerWeek: "4",
      workoutLength: "45-60",
      preferredTrainingDays: ["tue", "thu", "sat", "sun"],
      trainingLocations: ["planet-fitness"],
      availableEquipment: [
        "dumbbells",
        "bench",
        "incline-bench",
        "smith-machine",
        "cables",
        "machines",
        "treadmill",
        "bodyweight",
      ],
      heaviestDumbbells: "75 lbs",
      exerciseEnjoy: "Leg press, dumbbell bench press",
      movementsToImprove: ["bench-press", "squat"],
      planStyle: "muscle-focused",
      equipmentPreference: "machines",
      nutritionDirection: "bulk",
    },
    expected: {
      blocked: false,
      daysPerWeek: 4,
      weekdays: ["tuesday", "thursday", "saturday", "sunday"],
      primaryGoal: "build_muscle",
    },
  },
  "intermediate-freeweights-5day-strength": {
    responseOverrides: {
      mainGoals: ["get-stronger", "build-muscle"],
      primaryGoal: "Get stronger",
      topThreeGoals: "Get stronger\nImprove squat\nImprove bench press",
      trainingExperience: "1-2-years",
      currentRoutine: "Training four days weekly",
      tracksWorkouts: "yes",
      trackingTool: "Spreadsheet",
      trainingDaysPerWeek: "5",
      workoutLength: "other",
      workoutLengthOther: "75",
      preferredTrainingDays: ["mon", "tue", "thu", "fri", "sat"],
      trainingLocations: ["commercial-gym"],
      availableEquipment: ["barbells", "squat-rack", "bench", "dumbbells", "cables", "bodyweight"],
      movementsToImprove: ["squat", "bench-press", "deadlift-rdl"],
      planStyle: "strength-focused",
      equipmentPreference: "free-weights",
    },
    expected: {
      blocked: false,
      daysPerWeek: 5,
      weekdays: ["monday", "tuesday", "thursday", "friday", "saturday"],
      primaryGoal: "get_stronger",
    },
  },
  "time-limited-3day-30min": {
    responseOverrides: {
      trainingExperience: "3-6-months",
      trainingDaysPerWeek: "3",
      workoutLength: "20-30",
      preferredTrainingDays: ["tue", "thu", "sat"],
      availableEquipment: ["dumbbells", "cables", "bodyweight"],
      planStyle: "simple-repeatable",
    },
    expected: {
      blocked: false,
      daysPerWeek: 3,
      weekdays: ["tuesday", "thursday", "saturday"],
      primaryGoal: "general_fitness",
    },
  },
  "bodyweight-travel-4day-general-fitness": {
    responseOverrides: {
      trainingDaysPerWeek: "4",
      workoutLength: "other",
      workoutLengthOther: "35",
      preferredTrainingDays: ["mon", "wed", "fri", "sun"],
      trainingLocations: ["other"],
      trainingLocationsOther: "Hotel room",
      availableEquipment: ["bodyweight", "resistance-bands", "other"],
      availableEquipmentOther: "Safe door anchor",
      heaviestDumbbells: "N/A",
      movementsToImprove: ["push-ups", "pull-ups", "core"],
      equipmentPreference: "bodyweight",
    },
    expected: {
      blocked: false,
      daysPerWeek: 4,
      weekdays: ["monday", "wednesday", "friday", "sunday"],
      primaryGoal: "general_fitness",
    },
  },
  "cardio-priority-4day-hybrid": {
    responseOverrides: {
      mainGoals: ["athleticism", "consistency"],
      primaryGoal: "Improve athleticism and conditioning",
      topThreeGoals: "Improve conditioning\nMaintain strength\nBuild consistency",
      areasToImprove: ["conditioning", "overall"],
      trainingDaysPerWeek: "4",
      workoutLength: "30-45",
      preferredTrainingDays: ["tue", "thu", "sat", "sun"],
      availableEquipment: ["bike", "dumbbells", "bodyweight", "other"],
      availableEquipmentOther: "Rower",
      outsideActivity: "pretty-active",
      planStyle: "athletic-focused",
      planContents: ["weekly-split", "sets-reps", "progression", "cardio"],
    },
    expected: {
      blocked: false,
      daysPerWeek: 4,
      weekdays: ["tuesday", "thursday", "saturday", "sunday"],
      primaryGoal: "athleticism",
    },
  },
  "lower-emphasis-4day-secondary-upper": {
    responseOverrides: {
      mainGoals: ["build-muscle", "get-stronger"],
      primaryGoal: "Build muscle",
      topThreeGoals: "Build lower body\nImprove upper strength\nBuild consistency",
      areasToImprove: ["legs", "glutes", "back", "chest"],
      trainingDaysPerWeek: "4",
      workoutLength: "45-60",
      preferredTrainingDays: ["mon", "tue", "thu", "sat"],
      trainingLocations: ["commercial-gym"],
      availableEquipment: ["dumbbells", "barbells", "squat-rack", "bench", "cables", "machines", "bodyweight"],
      planStyle: "muscle-focused",
    },
    expected: {
      blocked: false,
      daysPerWeek: 4,
      weekdays: ["monday", "tuesday", "thursday", "saturday"],
      primaryGoal: "build_muscle",
    },
  },
  "no-overhead-3day-substitution": {
    responseOverrides: {
      mainGoals: ["get-stronger", "consistency"],
      primaryGoal: "Get stronger",
      topThreeGoals: "Get stronger\nTrain safely\nBuild consistency",
      trainingDaysPerWeek: "3",
      workoutLength: "other",
      workoutLengthOther: "50",
      preferredTrainingDays: ["mon", "wed", "fri"],
      professionalRestrictions: "yes",
      restrictedMovements: "No overhead loading",
      exercisesCannotDo: "Overhead press",
      movementsToImprove: ["bench-press", "rows", "squat"],
    },
    expected: {
      blocked: false,
      daysPerWeek: 3,
      weekdays: ["monday", "wednesday", "friday"],
      primaryGoal: "get_stronger",
    },
  },
  "ambiguous-warning-blocked": {
    responseOverrides: {
      trainingDaysPerWeek: "3",
      workoutLength: "30-45",
      preferredTrainingDays: ["mon", "wed", "fri"],
      warningSymptoms: ["other"],
      warningSymptomsOther: "Numbness during hinge movements",
    },
    expected: {
      blocked: true,
      daysPerWeek: 3,
      weekdays: ["monday", "wednesday", "friday"],
      primaryGoal: "general_fitness",
    },
  },
  "pullup-priority-no-pull-equipment": {
    responseOverrides: {
      mainGoals: ["get-stronger", "consistency"],
      primaryGoal: "General fitness",
      topThreeGoals: "General fitness\nImprove pull-ups\nBuild consistency",
      trainingDaysPerWeek: "3",
      workoutLength: "other",
      workoutLengthOther: "40",
      preferredTrainingDays: ["tue", "thu", "sat"],
      trainingLocations: ["home-gym"],
      availableEquipment: ["dumbbells", "bench", "bodyweight"],
      movementsToImprove: ["pull-ups", "rows"],
    },
    expected: {
      blocked: false,
      daysPerWeek: 3,
      weekdays: ["tuesday", "thursday", "saturday"],
      primaryGoal: "general_fitness",
    },
  },
};

export function createNormalizedPlanningFixtureInput(
  fixtureId: NormalizedPlanningFixtureId,
): CuratedOnboardingData {
  const draft = createCuratedOnboardingDraft();
  return {
    ...draft.data,
    intakeResponses: baseResponses(FIXTURE_DEFINITIONS[fixtureId].responseOverrides),
  };
}

export const NORMALIZED_PLANNING_FIXTURE_EXPECTATIONS = Object.fromEntries(
  NORMALIZED_PLANNING_FIXTURE_IDS.map((fixtureId) => [
    fixtureId,
    FIXTURE_DEFINITIONS[fixtureId].expected,
  ]),
) as Record<NormalizedPlanningFixtureId, FixtureDefinition["expected"]>;

export const NORMALIZED_PLANNING_FIXTURES = Object.fromEntries(
  NORMALIZED_PLANNING_FIXTURE_IDS.map((fixtureId) => [
    fixtureId,
    normalizeCuratedPlanningIntake(createNormalizedPlanningFixtureInput(fixtureId)),
  ]),
) as Record<NormalizedPlanningFixtureId, NormalizedPlanningIntakeV1>;
