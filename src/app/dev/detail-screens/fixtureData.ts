import type { EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
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

export const detailScreenFixtureExercises: readonly EditorExerciseOption[] = [
  { ...baseExercise, id: "fx-squat", name: "Back Squat", primary_muscle: "Quads", equipment: "Barbell", movement_pattern: "Squat", measurement_type: "reps" },
  { ...baseExercise, id: "fx-rdl", name: "Romanian Deadlift", primary_muscle: "Hamstrings", equipment: "Barbell", movement_pattern: "Hinge", measurement_type: "reps" },
  { ...baseExercise, id: "fx-bench", name: "Bench Press", primary_muscle: "Chest", equipment: "Barbell", movement_pattern: "Push", measurement_type: "reps" },
  { ...baseExercise, id: "fx-row", name: "Barbell Row", primary_muscle: "Back", equipment: "Barbell", movement_pattern: "Pull", measurement_type: "reps" },
  { ...baseExercise, id: "fx-bike", name: "Stationary Bike", primary_muscle: "Cardio", equipment: "Machine", movement_pattern: "Cardio", measurement_type: "time_distance", default_unit: "mi" },
];
