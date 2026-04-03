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
    .replace(/\s*•\s*\d+\s+(?:exercises?|strength|cardio|unknown)$/i, "")
    .trim();
}

export function splitSessionHeaderTitle(input: string | null | undefined): { title: string; subtitle?: string } | null {
  const value = String(input ?? "").trim();
  if (!value) return null;

  const dividerMatch = value.match(/^(.+?)\s*[:\-–—|]\s*(.+)$/);
  if (!dividerMatch) {
    return { title: value };
  }

  const maybeTitle = dividerMatch[1]?.trim();
  const maybeSubtitle = dividerMatch[2]?.trim();
  if (!maybeTitle || !maybeSubtitle) {
    return { title: value };
  }

  return { title: maybeTitle, subtitle: maybeSubtitle };
}
