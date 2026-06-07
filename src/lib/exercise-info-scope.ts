export type ExerciseInfoAnalyticsScope = "all_time" | "current_routine";
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
] as const satisfies ReadonlyArray<{
  id: ExerciseInfoAnalyticsScope;
  label: string;
  summary: string;
}>;

export function isExerciseInfoAnalyticsScope(value: string | null | undefined): value is ExerciseInfoAnalyticsScope {
  return value === "all_time" || value === "current_routine";
}

export function getExerciseInfoAnalyticsScopeLabel(scope: ExerciseInfoAnalyticsScope) {
  return EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS.find((option) => option.id === scope)?.label ?? "All Time";
}

export function getExerciseInfoAnalyticsScopeDisplayLabel(
  scope: ExerciseInfoAnalyticsScope,
  activeRoutineTitle?: string | null,
) {
  if (scope !== "current_routine") {
    return getExerciseInfoAnalyticsScopeLabel(scope);
  }

  const normalizedRoutineTitle = typeof activeRoutineTitle === "string" ? activeRoutineTitle.trim() : "";
  return normalizedRoutineTitle.length > 0
    ? `Current Routine: ${normalizedRoutineTitle}`
    : "Current Routine";
}
