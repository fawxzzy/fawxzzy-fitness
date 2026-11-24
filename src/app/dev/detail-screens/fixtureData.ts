import type { EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

// Static QA data for `/dev/detail-screens`. No user data, no Supabase.
export const DETAIL_SCREEN_FIXTURE_IDS = [
  "create-day",
  "copy-day",
  "days",
  "days-empty",
  "routine-add-exercise",
  "session-add-exercise",
] as const;

export type DetailScreenFixtureId = (typeof DETAIL_SCREEN_FIXTURE_IDS)[number];

export function isDetailScreenFixtureId(value: string): value is DetailScreenFixtureId {
  return (DETAIL_SCREEN_FIXTURE_IDS as readonly string[]).includes(value);
}

export function resolveDetailScreenFixtureNames(long: boolean) {
  return long
    ? {
      routineName: "Twelve Week Strength and Conditioning Block for the Spring Season",
      dayLabel: "Lower Body Power and Posterior Chain Accessories",
    }
    : { routineName: "QA Routine", dayLabel: "Lower A" };
}

export function detailScreenFixtureDays(routineName: string): WorkoutPlanSourceListItem[] {
  return [
    {
      id: "fixture-day-1",
      sourceRoutineDayId: "fixture-day-1",
      sourceRoutineId: "fixture-routine",
      sourceRoutineName: routineName,
      isCurrentRoutine: true,
      dayIndex: 1,
      title: "Lower A",
      weekdayLabel: "Mon",
      isRest: false,
      splitSummary: { total: 3, strength: 3, cardio: 0, bodyweight: 0, unknown: 0 },
      previewExercises: [
        { id: "fx-squat", name: "Back Squat", goalLine: "3 x 5" },
        { id: "fx-rdl", name: "Romanian Deadlift", goalLine: "3 x 8" },
        { id: "fx-lunge", name: "Walking Lunge", goalLine: "2 x 10" },
      ],
    },
    {
      id: "fixture-day-2",
      sourceRoutineDayId: "fixture-day-2",
      sourceRoutineId: "fixture-routine",
      sourceRoutineName: routineName,
      isCurrentRoutine: true,
      dayIndex: 2,
      title: "Upper A",
      weekdayLabel: "Tue",
      isRest: false,
      splitSummary: { total: 2, strength: 2, cardio: 0, bodyweight: 0, unknown: 0 },
      previewExercises: [
        { id: "fx-bench", name: "Bench Press", goalLine: "3 x 5" },
        { id: "fx-row", name: "Barbell Row", goalLine: "3 x 8" },
      ],
    },
  ];
}

const baseExercise = {
  user_id: null,
  is_global: true,
  default_unit: "lbs",
  calories_estimation_method: null,
  image_howto_path: null,
  image_icon_path: null,
} as const;

/**
 * Back Squat has a UUID-shaped id on purpose: the exercise INFO sheet refuses any other id ("Invalid exercise link").
 * A capture script can then seed `sessionStorage["fawxzzy:exercise-info-cache:v6"]` with a server-source payload for this
 * id and the sheet opens without the signed-in API.
 */
export const DETAIL_SCREEN_FIXTURE_SQUAT_ID = "5b0f4f64-2a7e-4c1e-9d3a-0a1b2c3d4e5f";

export const detailScreenFixtureExercises: readonly EditorExerciseOption[] = [
  { ...baseExercise, id: DETAIL_SCREEN_FIXTURE_SQUAT_ID, name: "Back Squat", primary_muscle: "Quads", equipment: "Barbell", movement_pattern: "Squat", measurement_type: "reps" },
  { ...baseExercise, id: "fx-rdl", name: "Romanian Deadlift", primary_muscle: "Hamstrings", equipment: "Barbell", movement_pattern: "Hinge", measurement_type: "reps" },
  { ...baseExercise, id: "fx-bench", name: "Bench Press", primary_muscle: "Chest", equipment: "Barbell", movement_pattern: "Push", measurement_type: "reps" },
  { ...baseExercise, id: "fx-row", name: "Barbell Row", primary_muscle: "Back", equipment: "Barbell", movement_pattern: "Pull", measurement_type: "reps" },
  { ...baseExercise, id: "fx-bike", name: "Stationary Bike", primary_muscle: "Cardio", equipment: "Machine", movement_pattern: "Cardio", measurement_type: "time_distance", default_unit: "mi" },
];

/** A long library (40 rows) to check scrolling, the result count and the filter chips. */
export function detailScreenFixtureManyExercises(): EditorExerciseOption[] {
  const muscles = ["Quads", "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Hamstrings", "Glutes"];
  const extra = Array.from({ length: 35 }, (_, index) => ({
    ...baseExercise,
    id: `fx-many-${index + 1}`,
    name: `Fixture Exercise ${index + 1}`,
    primary_muscle: muscles[index % muscles.length],
    equipment: index % 2 === 0 ? "Dumbbell" : "Cable",
    movement_pattern: index % 3 === 0 ? "Push" : "Pull",
    measurement_type: "reps" as const,
  }));
  return [...detailScreenFixtureExercises, ...extra];
}

/** One last-used setup (Back Squat 4 x 6-8 at 185 lbs) so "Use last" has something to apply. */
export function detailScreenFixtureStats(): ExerciseStatsOption[] {
  return [{
    exerciseId: DETAIL_SCREEN_FIXTURE_SQUAT_ID,
    statsExerciseId: DETAIL_SCREEN_FIXTURE_SQUAT_ID,
    lastWeight: 185,
    lastReps: 6,
    lastUnit: "lbs",
    lastPerformedAt: "2026-11-20T17:00:00.000Z",
    lastProgressionPlaybookId: null,
    lastProgressionPlaybookConfig: null,
    lastConfiguredAt: "2026-11-20T17:00:00.000Z",
    lastConfiguredTargetSets: 4,
    lastConfiguredTargetRepsMin: 6,
    lastConfiguredTargetRepsMax: 8,
    lastConfiguredTargetWeight: 185,
    lastConfiguredTargetWeightUnit: "lbs",
    lastConfiguredTargetDurationSeconds: null,
    lastConfiguredTargetDistance: null,
    lastConfiguredTargetDistanceUnit: null,
    lastConfiguredTargetCalories: null,
    lastConfiguredMeasurementType: "reps",
    lastConfiguredDefaultUnit: null,
    prWeight: 205,
    prReps: 5,
    prEst1rm: 239,
    actualPrWeight: 205,
    actualPrReps: 5,
    actualPrAt: "2026-11-10T17:00:00.000Z",
  }];
}
