export function formatExerciseCountMetaLabel(totalExercises: number | null | undefined) {
  const safeTotal = Number.isFinite(totalExercises ?? null) && (totalExercises ?? 0) > 0
    ? Math.floor(totalExercises as number)
    : 0;
  return `${safeTotal} exercise${safeTotal === 1 ? "" : "s"}`;
}

export function formatRoutineHeaderMeta({
  routineName,
  totalExercises,
}: {
  routineName: string;
  totalExercises: number | null | undefined;
}) {
  return `${routineName} • ${formatExerciseCountMetaLabel(totalExercises)}`;
}

export function formatAddExerciseHeaderSubtitle(routineName: string) {
  return routineName
    .replace(/\s*•\s*\d+\s+exercises?$/i, "")
    .trim();
}
