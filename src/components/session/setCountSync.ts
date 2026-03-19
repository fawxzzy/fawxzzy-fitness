type ExerciseSetCountSource = {
  id: string;
  loggedSetCount: number;
};

export function mergeLoggedSetCountState(
  current: Record<string, number>,
  exercises: ExerciseSetCountSource[],
): Record<string, number> {
  const next = Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.loggedSetCount]));

  for (const exercise of exercises) {
    const existing = current[exercise.id];
    if (typeof existing === "number" && existing > (next[exercise.id] ?? 0)) {
      next[exercise.id] = existing;
    }
  }

  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return next;
  }

  for (const key of nextKeys) {
    if (current[key] !== next[key]) {
      return next;
    }
  }

  return current;
}

export function getNextPublishedSetCount(previousCount: number | null, nextCount: number): number | null {
  return previousCount === nextCount ? null : nextCount;
}
