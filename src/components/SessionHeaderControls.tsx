"use client";

import { SessionBackButton } from "@/components/SessionBackButton";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { getDayTaxonomyHeaderSummaryParts } from "@/lib/day-summary";

export function SessionHeaderControls({
  routineName,
  sessionDayName,
  sessionSummaryCounts,
  isRestDay = false,
  backHref,
}: {
  routineName: string;
  sessionDayName: string;
  sessionSummaryCounts: {
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  isRestDay?: boolean;
  backHref?: string;
}) {
  const { countsSummary } = getDayTaxonomyHeaderSummaryParts({
    dayName: sessionDayName,
    summary: sessionSummaryCounts,
    isRest: isRestDay,
  });

  return (
    <SharedScreenHeader
      recipe="currentSession"
      title={<RoutineDayHeaderTitle leadingItems={[routineName.trim() || "Routine"]} dayLabel={sessionDayName} />}
      subtitle={countsSummary}
      action={<SessionBackButton href={backHref} />}
      align="center"
    />
  );
}
