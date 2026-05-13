"use client";

import { SessionBackButton } from "@/components/SessionBackButton";
import { TodayOverviewHeader } from "@/components/today/TodayScreenFamily";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { buildDayTaxonomyInfoRailItems } from "@/lib/header-info-rail";

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
  const titleNode = <RoutineDayHeaderTitle leadingItems={[routineName.trim() || "Routine"]} dayLabel={sessionDayName} dayLabelOrder="day-first" />;
  const subtitleItems = isRestDay
    ? []
    : buildDayTaxonomyInfoRailItems(sessionSummaryCounts);
  const subtitleNode = subtitleItems.length > 0
    ? (
      <HeaderInfoRail
        items={subtitleItems}
        ariaLabel="Current session summary"
        layout="scroll"
        className="justify-center text-center"
      />
    )
    : undefined;

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
