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

export function buildAccountStorageSnapshot(preview: Pick<AccountWorkoutExportPreview, "counts" | "dateRange" | "scope">): AccountStorageSnapshot {
  const inProgressSessions = Math.max(0, preview.counts.sessions - preview.counts.completedSessions);
  const visibleCompletedSessions = Math.max(0, preview.counts.visibleCompletedSessions ?? preview.counts.completedSessions);
  const hiddenQaCompletedSessions = Math.max(0, preview.counts.hiddenQaCompletedSessions ?? (preview.counts.completedSessions - visibleCompletedSessions));
  const visibleSessionExercises = Math.max(0, preview.counts.visibleSessionExercises ?? preview.counts.sessionExercises);
  const visibleSets = Math.max(0, preview.counts.visibleSets ?? preview.counts.sets);
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
        { label: "History Sessions", value: String(visibleCompletedSessions) },
        { label: "Stored Sessions", value: String(preview.counts.sessions) },
        { label: "Completed Sessions", value: String(preview.counts.completedSessions) },
        ...(hiddenQaCompletedSessions > 0 ? [{ label: "Hidden QA", value: String(hiddenQaCompletedSessions) }] : []),
        ...(inProgressSessions > 0 ? [{ label: "In Progress", value: String(inProgressSessions) }] : []),
        { label: "History Exercises", value: String(visibleSessionExercises) },
        { label: "Stored Exercise Rows", value: String(preview.counts.sessionExercises) },
        { label: "History Sets", value: String(visibleSets) },
        { label: "Stored Sets", value: String(preview.counts.sets) },
        { label: "Stored Progression Events", value: String(preview.counts.progressionEvents) },
      ],
    }];
    totalRecordCount = historyRecordCount;
  } else if (preview.scope === "routines") {
    sections = [{
      title: "Routines",
      metrics: [
        { label: "Routines", value: String(preview.counts.routines) },
        { label: "Routine Days", value: String(preview.counts.routineDays) },
        { label: "Routine Exercises", value: String(preview.counts.routineExercises) },
      ],
    }];
    totalRecordCount = routineRecordCount;
  } else {
    sections = [
      {
        title: "History",
        metrics: [
          { label: "History Sessions", value: String(visibleCompletedSessions) },
          { label: "Stored Sessions", value: String(preview.counts.sessions) },
          { label: "Completed Sessions", value: String(preview.counts.completedSessions) },
          ...(hiddenQaCompletedSessions > 0 ? [{ label: "Hidden QA", value: String(hiddenQaCompletedSessions) }] : []),
          ...(inProgressSessions > 0 ? [{ label: "In Progress", value: String(inProgressSessions) }] : []),
          { label: "History Exercises", value: String(visibleSessionExercises) },
          { label: "Stored Exercise Rows", value: String(preview.counts.sessionExercises) },
          { label: "History Sets", value: String(visibleSets) },
          { label: "Stored Sets", value: String(preview.counts.sets) },
          { label: "Stored Progression Events", value: String(preview.counts.progressionEvents) },
        ],
      },
      {
        title: "Routines",
        metrics: [
          { label: "Routines", value: String(preview.counts.routines) },
          { label: "Routine Days", value: String(preview.counts.routineDays) },
          { label: "Routine Exercises", value: String(preview.counts.routineExercises) },
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
