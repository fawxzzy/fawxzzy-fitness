export const EXERCISE_OPTIONS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Bench Press",
    primary_muscle: "chest",
    equipment: "barbell",
    movement_pattern: "push",
    how_to_short: "Lie on a flat bench, press the bar from chest level to locked elbows, and lower under control.",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Back Squat",
    primary_muscle: "quadriceps",
    equipment: "barbell",
    movement_pattern: "squat",
    how_to_short: "Brace your core, sit hips down and back until thighs are at least parallel, then stand tall.",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Deadlift",
    primary_muscle: "hamstrings",
    equipment: "barbell",
    movement_pattern: "hinge",
    how_to_short: "Hinge at the hips with a neutral spine, stand by driving feet through the floor, and lower with control.",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Barbell Row",
    primary_muscle: "lats",
    equipment: "barbell",
    movement_pattern: "pull",
    how_to_short: "Hinge torso forward, row bar to lower ribs, pause briefly, then lower without losing torso position.",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    name: "Overhead Press",
    primary_muscle: "shoulders",
    equipment: "barbell",
    movement_pattern: "push",
    how_to_short: "Press bar from upper chest overhead in a straight path while keeping ribs down and glutes tight.",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    name: "Pull-Up",
    primary_muscle: "lats",
    equipment: "bodyweight",
    movement_pattern: "pull",
    how_to_short: "Start from a dead hang, pull chest toward the bar, and descend to full elbow extension.",
  },
] as const;

const exerciseNameMap = new Map<string, string>(EXERCISE_OPTIONS.map((exercise) => [exercise.id, exercise.name]));

export function getExerciseName(exerciseId: string) {
  return exerciseNameMap.get(exerciseId) ?? exerciseId;
}
