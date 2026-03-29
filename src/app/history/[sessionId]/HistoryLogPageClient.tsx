"use client";

import { LogAuditClient } from "./LogAuditClient";
import type { SessionSummary } from "../session-summary";
import {
  normalizeHistoryLogExercises,
  type IncomingHistoryAuditExercise,
} from "@/lib/history-log-normalization";

export function HistoryLogPageClient(props: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises?: IncomingHistoryAuditExercise[];
  sessionExercises?: IncomingHistoryAuditExercise[];
  logExercises?: IncomingHistoryAuditExercise[];
  workoutExercises?: IncomingHistoryAuditExercise[];
  sessionSummary: SessionSummary;
  backHref: string;
}) {
  const normalizedExercises = normalizeHistoryLogExercises({
    exercises: props.exercises,
    sessionExercises: props.sessionExercises,
    logExercises: props.logExercises,
    workoutExercises: props.workoutExercises,
  });

  return <LogAuditClient {...props} exercises={normalizedExercises} />;
}
