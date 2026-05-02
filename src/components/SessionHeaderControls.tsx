"use client";

import { SessionBackButton } from "@/components/SessionBackButton";
import { TodayOverviewHeader } from "@/components/today/TodayScreenFamily";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
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
  const titleNode = <RoutineDayHeaderTitle leadingItems={[routineName.trim() || "Routine"]} dayLabel={sessionDayName} />;
  const subtitleNode = (
    <AccentDotSeparatedText
      text={countsSummary}
      className="justify-center text-center"
      separatorClassName="h-[3.5px] w-[3.5px]"
    />
  );

  return (
    <TodayOverviewHeader
      title={titleNode}
      subtitle={subtitleNode}
      action={<SessionBackButton href={backHref} />}
      align="center"
      className="px-1"
      separatorClassName="!mt-2 !h-[2px] !bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.24),rgb(var(--accent-divider-rgb)/0.98),rgb(var(--accent-divider-rgb)/0.24))] !shadow-[0_0_18px_rgb(var(--accent-divider-rgb)/0.24)]"
    />
  );
}
