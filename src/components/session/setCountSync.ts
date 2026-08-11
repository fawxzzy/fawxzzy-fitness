type ExerciseSetCountSource = {
  id: string;
  loggedSetCount: number;
};

export function mergeLoggedSetCountState(
  current: Record<string, number>,
  exercises: ExerciseSetCountSource[],
): Record<string, number> {
  // This function is only the stable server projection. Whether a local count
  // should temporarily win is an explicit state-machine decision owned by
  // reconcileSessionRowClientState via setCountOverrideActive. Encoding that
  // decision here with Math.max made a legitimate server-side decrease
  // indistinguishable from a stale response and prevented convergence forever.
  let changed = Object.keys(current).length !== exercises.length;
  const merged: Record<string, number> = {};

  for (const exercise of exercises) {
    const currentValue = current[exercise.id];
    merged[exercise.id] = exercise.loggedSetCount;
    if (currentValue !== exercise.loggedSetCount) {
      changed = true;
    }
  }

  return changed ? merged : current;
}

export function getNextPublishedSetCount(previousCount: number | null, nextCount: number): number | null {
  return previousCount === nextCount ? null : nextCount;
}
