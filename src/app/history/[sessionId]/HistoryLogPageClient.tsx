"use client";

import { LogAuditClient } from "./LogAuditClient";
import type { SessionSummary } from "../session-summary";
import {
  normalizeHistoryLogExercises,
  type IncomingHistoryAuditExercise,
} from "@/lib/history-log-normalization";


function pickPreferredArray<T>(candidates: Array<T[] | null | undefined>): T[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}


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
  const incomingExercises = pickPreferredArray([
    props.exercises,
    props.sessionExercises,
    props.logExercises,
    props.workoutExercises,
  ]);

  const normalizedExercises = normalizeHistoryLogExercises({
    exercises: props.exercises,
    sessionExercises: props.sessionExercises,
    logExercises: props.logExercises,
    workoutExercises: props.workoutExercises,
  });

  if (props.sessionSummary.exerciseCount > 0 && normalizedExercises.length === 0) {
    console.warn("Normalization mismatch: upstream data present but normalized empty");
  }

  if (normalizedExercises.length !== incomingExercises.length) {
    console.warn("Normalization mismatch: normalized length differs from incoming length", {
      incomingLength: incomingExercises.length,
      normalizedLength: normalizedExercises.length,
    });
  }

  return <LogAuditClient {...props} exercises={normalizedExercises} />;
}
