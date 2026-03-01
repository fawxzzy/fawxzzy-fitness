export function getExerciseInfoHref(exerciseId: string, options?: { returnTo?: string }) {
  const returnTo = options?.returnTo;

  if (returnTo && returnTo.startsWith("/")) {
    return `/exercises/${exerciseId}?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return `/exercises/${exerciseId}`;
}
