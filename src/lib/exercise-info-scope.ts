export type ExerciseInfoAnalyticsScope = "all_time" | "current_routine" | "current_cycle";
export type ExerciseInfoSectionScopeKey =
  | "stats"
  | "performance"
  | "progress"
  | "progression"
  | "pr-history"
  | "recent-history";

export const EXERCISE_INFO_SECTION_SCOPE_KEYS: ExerciseInfoSectionScopeKey[] = [
  "stats",
  "performance",
  "progress",
  "progression",
  "pr-history",
  "recent-history",
];

export const EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS = [
  {
    id: "all_time",
    label: "All Time",
    summary: "Lifetime exercise history",
  },
  {
    id: "current_routine",
    label: "Current Routine",
    summary: "Active routine context",
  },
  {
    id: "current_cycle",
    label: "Current Cycle",
    summary: "Active cycle context",
  },
] as const satisfies ReadonlyArray<{
  id: ExerciseInfoAnalyticsScope;
  label: string;
  summary: string;
}>;

export function isExerciseInfoAnalyticsScope(value: string | null | undefined): value is ExerciseInfoAnalyticsScope {
  return value === "all_time" || value === "current_routine" || value === "current_cycle";
}

export function getExerciseInfoAnalyticsScopeLabel(scope: ExerciseInfoAnalyticsScope) {
  return EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS.find((option) => option.id === scope)?.label ?? "All Time";
}

export function getNextExerciseInfoAnalyticsScope(scope: ExerciseInfoAnalyticsScope) {
  const scopeOrder = EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS.map((option) => option.id);
  const currentIndex = scopeOrder.indexOf(scope);
  if (currentIndex < 0) {
    return scopeOrder[0] ?? "all_time";
  }

  return scopeOrder[(currentIndex + 1) % scopeOrder.length] ?? "all_time";
}

export function getExerciseInfoAnalyticsScopeDisplayLabel(
  scope: ExerciseInfoAnalyticsScope,
  activeRoutineTitle?: string | null,
) {
  if (scope === "all_time") {
    return getExerciseInfoAnalyticsScopeLabel(scope);
  }

  const normalizedRoutineTitle = typeof activeRoutineTitle === "string" ? activeRoutineTitle.trim() : "";
  if (scope === "current_routine") {
    return normalizedRoutineTitle.length > 0
      ? `Current Routine: ${normalizedRoutineTitle}`
      : "Current Routine";
  }

  return normalizedRoutineTitle.length > 0
    ? `Current Cycle: ${normalizedRoutineTitle}`
    : "Current Cycle";
}
