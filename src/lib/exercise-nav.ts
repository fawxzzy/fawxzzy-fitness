import { isSafeAppPath } from "@/lib/navigation-return";

export function getExerciseInfoHref(exerciseId: string, options?: { returnTo?: string }) {
  const returnTo = options?.returnTo;

  if (isSafeAppPath(returnTo)) {
    return `/exercises/${exerciseId}?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return `/exercises/${exerciseId}`;
}
