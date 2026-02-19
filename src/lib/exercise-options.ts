export const EXERCISE_OPTIONS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Bench Press" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Back Squat" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Deadlift" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Barbell Row" },
  { id: "55555555-5555-5555-5555-555555555555", name: "Overhead Press" },
  { id: "66666666-6666-6666-6666-666666666666", name: "Pull-Up" },
] as const;

const exerciseNameMap = new Map<string, string>(EXERCISE_OPTIONS.map((exercise) => [exercise.id, exercise.name]));

export function getExerciseName(exerciseId: string) {
  return exerciseNameMap.get(exerciseId) ?? exerciseId;
}

