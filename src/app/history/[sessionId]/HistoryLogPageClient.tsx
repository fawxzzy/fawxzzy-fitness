"use client";

import { useCallback, useState } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { LogAuditClient } from "./LogAuditClient";
import type { SessionSummary } from "../session-summary";

type AuditSet = {
  id: string;
  set_index: number;
  weight: number;
  reps: number;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "mi" | "km" | "m" | null;
  calories: number | null;
  weight_unit: "lbs" | "kg" | null;
};

type AuditExercise = {
  id: string;
  exercise_id: string;
  notes: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: "mi" | "km" | "m" | null;
  sets: AuditSet[];
};

export function HistoryLogPageClient(props: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  exerciseOptions: Array<{ id: string; name: string; user_id: string | null; is_global: boolean }>;
  sessionSummary: SessionSummary;
  initialIsEditing: boolean;
  backHref: string;
}) {
  const [bottomActions, setBottomActions] = useState<React.ReactNode | null>(null);
  const handleBottomActionsChange = useCallback((actions: React.ReactNode | null) => {
    setBottomActions(actions);
  }, []);

  return (
    <>
      <LogAuditClient {...props} onBottomActionsChange={handleBottomActionsChange} />
      {bottomActions ? <BottomActionBar variant="sticky">{bottomActions}</BottomActionBar> : null}
    </>
  );
}
