type RoutineIdentity = {
  id: string;
};

export function resolveReplacementActiveRoutineId(
  remainingRoutines: readonly RoutineIdentity[],
): string | null {
  return remainingRoutines[0]?.id ?? null;
}
