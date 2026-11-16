"use client";

import type { ReactNode } from "react";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";

/** "Lower A · QA Routine": the day first, then the routine, in plain words. */
export function formatSessionHeaderSubtitle(sessionDayName: string, routineName: string) {
  return [sessionDayName.trim(), routineName.trim()].filter(Boolean).join(" · ");
}

// The live workout is a detail screen (DESIGN-CONTRACT.md section 15): title "Workout", one subtitle line
// (day · routine), Back on the left, and at most one trailing chip (the offline badge on the cached copy).
// Progress counts live in the exercise list, not in the header.
export function SessionHeaderControls({
  routineName,
  sessionDayName,
  backHref,
  statusBadge,
}: {
  routineName: string;
  sessionDayName: string;
  backHref?: string;
  statusBadge?: ReactNode;
}) {
  return (
    <ScreenHeader
      kind="detail"
      title="Workout"
      subtitle={formatSessionHeaderSubtitle(sessionDayName, routineName)}
      back={<ScreenHeaderBackButton href={backHref ?? "/today"} historyBehavior="history-first" label="Back" />}
      trailing={statusBadge}
    />
  );
}
