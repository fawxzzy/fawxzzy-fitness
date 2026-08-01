type ExerciseSetCountSource = {
  id: string;
  loggedSetCount: number;
};

export function mergeLoggedSetCountState(
  current: Record<string, number>,
  exercises: ExerciseSetCountSource[],
): Record<string, number> {
  // Per-key reconciliation (mirrors the setCountOverrideActive / isSkipOverrideActive
  // precedence pattern in sessionRowClientState.ts, but expressed as a pure
  // comparison since this function has no persistent override flag to consult):
  //   - the server's exercise id list is the key denominator: exercises added or
  //     removed on the server are added/removed here too.
  //   - for a key present on both sides, a higher local (in-progress) count wins
  //     over a lower/stale server count, and a higher server count is accepted.
  //   - a key with no prior local value takes the server value outright.
  // The previous implementation discarded every local value the moment ANY
  // single key differed, silently losing in-progress counts for unrelated,
  // already-correct exercises.
  let changed = Object.keys(current).length !== exercises.length;
  const merged: Record<string, number> = {};

  for (const exercise of exercises) {
    const currentValue = current[exercise.id];
    const serverValue = exercise.loggedSetCount;
    const resolvedValue = currentValue !== undefined && currentValue > serverValue
      ? currentValue
      : serverValue;

    merged[exercise.id] = resolvedValue;
    if (currentValue !== resolvedValue) {
      changed = true;
    }
  }

  return changed ? merged : current;
}

export function getNextPublishedSetCount(previousCount: number | null, nextCount: number): number | null {
  return previousCount === nextCount ? null : nextCount;
}
