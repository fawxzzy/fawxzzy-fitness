"use client";

import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";

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
    unknown: number;
  };
  isRestDay?: boolean;
  backHref?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="currentSession"
      title={routineName}
      subtitle={<DayTaxonomyHeaderSummary dayName={sessionDayName} summary={sessionSummaryCounts} isRest={isRestDay} />}
      action={(
        <div className="flex items-center gap-2">
          <OfflineSyncBadge />
          <SessionBackButton href={backHref} />
        </div>
      )}
    />
  );
}
