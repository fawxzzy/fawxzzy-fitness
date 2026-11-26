import type { AccountWorkoutExportPreview } from "@/lib/account-workout-export-preview";

export type AccountStorageMetricItem = {
  label: string;
  value: string;
};

export type AccountStorageSection = {
  title: string;
  metrics: AccountStorageMetricItem[];
};

export type AccountStorageSnapshot = {
  sections: AccountStorageSection[];
  metrics: AccountStorageMetricItem[];
  historyRangeLabel: string;
  totalRecordCount: number;
};

export function buildAccountStorageSnapshot(preview: Pick<AccountWorkoutExportPreview, "counts" | "dateRange" | "scope" | "progressionSummary">): AccountStorageSnapshot {
  const inProgressSessions = Math.max(0, preview.counts.sessions - preview.counts.completedSessions);
  const visibleCompletedSessions = Math.max(0, preview.counts.visibleCompletedSessions ?? preview.counts.completedSessions);
  const hiddenQaCompletedSessions = Math.max(0, preview.counts.hiddenQaCompletedSessions ?? (preview.counts.completedSessions - visibleCompletedSessions));
  const visibleSessionExercises = Math.max(0, preview.counts.visibleSessionExercises ?? preview.counts.sessionExercises);
  const visibleSets = Math.max(0, preview.counts.visibleSets ?? preview.counts.sets);
  const progressionMetrics = [
    { label: "Progression changes", value: String(preview.counts.progressionEvents) },
    { label: "Promotions", value: String(preview.progressionSummary.promotionCount) },
    { label: "Exercises progressed", value: String(preview.progressionSummary.distinctExerciseCount) },
  ];
  const historyRecordCount =
    preview.counts.sessions
    + preview.counts.sessionExercises
    + preview.counts.sets
    + preview.counts.progressionEvents;
  const routineRecordCount =
    preview.counts.routines
    + preview.counts.routineDays
    + preview.counts.routineExercises;

  let sections: AccountStorageSection[];
  let totalRecordCount: number;

  if (preview.scope === "history") {
    sections = [{
      title: "History",
      metrics: [
        { label: "Workouts in History", value: String(visibleCompletedSessions) },
        { label: "All saved workouts", value: String(preview.counts.sessions) },
        { label: "Finished workouts", value: String(preview.counts.completedSessions) },
        ...(hiddenQaCompletedSessions > 0 ? [{ label: "Hidden test data", value: String(hiddenQaCompletedSessions) }] : []),
        ...(inProgressSessions > 0 ? [{ label: "In progress", value: String(inProgressSessions) }] : []),
        { label: "Exercises in History", value: String(visibleSessionExercises) },
        { label: "All saved exercises", value: String(preview.counts.sessionExercises) },
        { label: "Sets in History", value: String(visibleSets) },
        { label: "All saved sets", value: String(preview.counts.sets) },
        ...progressionMetrics,
      ],
    }];
    totalRecordCount = historyRecordCount;
  } else if (preview.scope === "routines") {
    sections = [{
      title: "Routines",
      metrics: [
        { label: "Routines", value: String(preview.counts.routines) },
        { label: "Routine days", value: String(preview.counts.routineDays) },
        { label: "Routine exercises", value: String(preview.counts.routineExercises) },
      ],
    }];
    totalRecordCount = routineRecordCount;
  } else {
    sections = [
      {
        title: "History",
        metrics: [
          { label: "Workouts in History", value: String(visibleCompletedSessions) },
          { label: "All saved workouts", value: String(preview.counts.sessions) },
          { label: "Finished workouts", value: String(preview.counts.completedSessions) },
          ...(hiddenQaCompletedSessions > 0 ? [{ label: "Hidden test data", value: String(hiddenQaCompletedSessions) }] : []),
          ...(inProgressSessions > 0 ? [{ label: "In progress", value: String(inProgressSessions) }] : []),
          { label: "Exercises in History", value: String(visibleSessionExercises) },
          { label: "All saved exercises", value: String(preview.counts.sessionExercises) },
          { label: "Sets in History", value: String(visibleSets) },
          { label: "All saved sets", value: String(preview.counts.sets) },
          ...progressionMetrics,
        ],
      },
      {
        title: "Routines",
        metrics: [
          { label: "Routines", value: String(preview.counts.routines) },
          { label: "Routine days", value: String(preview.counts.routineDays) },
          { label: "Routine exercises", value: String(preview.counts.routineExercises) },
        ],
      },
    ];
    totalRecordCount = historyRecordCount + routineRecordCount;
  }

  return {
    sections,
    metrics: sections.flatMap((section) => section.metrics),
    historyRangeLabel: preview.dateRange.label,
    totalRecordCount,
  };
}
