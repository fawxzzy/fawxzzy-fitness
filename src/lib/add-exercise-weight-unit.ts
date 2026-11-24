export type AddExerciseWeightUnit = "lbs" | "kg";

// One rule for every Add exercise entry: an explicit routine unit ("kg" or "lbs") always wins. Only when the
// routine has none (or an unknown value) does the destination's own default apply: the routine day editor defaults to
// "lbs" and a workout without a routine defaults to "kg", exactly what that screen already logs in, so the goal the
// person types here is in the same unit they will see while logging.
export function resolveAddExerciseWeightUnit(
  routineUnit: string | null | undefined,
  destinationDefault: AddExerciseWeightUnit,
): AddExerciseWeightUnit {
  if (routineUnit === "kg" || routineUnit === "lbs") return routineUnit;
  return destinationDefault;
}
