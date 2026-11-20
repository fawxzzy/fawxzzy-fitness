"use client";

import type { ReactNode } from "react";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { getSessionBackLabel, handleSessionBackClick } from "@/components/sessionBackAction";

/** "Lower A · QA Routine": the day first, then the routine, in plain words. */
export function formatSessionHeaderSubtitle(sessionDayName: string, routineName: string) {
  return [sessionDayName.trim(), routineName.trim()].filter(Boolean).join(" · ");
}

// The live workout is a detail screen (DESIGN-CONTRACT.md section 15): title "Workout", one subtitle line
// (day · routine), Back on the left, the inline sync status on the title line ("– Offline"), and the app menu top
// right (`appMenu`; the button comes from the screen shell).
// Progress counts live in the exercise list, not in the header.
export function SessionHeaderControls({
  routineName,
  sessionDayName,
  backHref,
  statusBadge,
  exerciseOpen = false,
  onCloseExercise,
}: {
  routineName: string;
  sessionDayName: string;
  backHref?: string;
  statusBadge?: ReactNode;
  /** An exercise is open in place: the first Back tap closes it (sessionBackAction.ts). */
  exerciseOpen?: boolean;
  onCloseExercise?: () => void;
}) {
  return (
    <ScreenHeader
      kind="detail"
      appMenu
      title="Workout"
      subtitle={formatSessionHeaderSubtitle(sessionDayName, routineName)}
      back={(
        <ScreenHeaderBackButton
          href={backHref ?? "/today"}
          historyBehavior="history-first"
          label={getSessionBackLabel(exerciseOpen)}
          onClick={(event) => handleSessionBackClick(event, exerciseOpen, onCloseExercise)}
        />
      )}
      status={statusBadge}
    />
  );
}
