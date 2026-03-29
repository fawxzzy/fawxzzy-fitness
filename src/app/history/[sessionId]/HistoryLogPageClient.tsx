"use client";

import { LogAuditClient } from "./LogAuditClient";
import type { SessionSummary } from "../session-summary";

type AuditSet = {
  id: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "mi" | "km" | "m" | null;
  calories: number | null;
  weight_unit: "lbs" | "kg" | null;
};

type AuditExercise = {
  id: string;
  exercise_id: string;
  exercise_name?: string | null;
  exercise_slug?: string | null;
  exercise_image_path?: string | null;
  exercise_image_icon_path?: string | null;
  exercise_image_howto_path?: string | null;
  notes: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  sets: AuditSet[];
};

export function HistoryLogPageClient(props: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  sessionSummary: SessionSummary;
  backHref: string;
}) {
  return <LogAuditClient {...props} />;
}
