"use client";

import type { ReactNode } from "react";
import { SessionBackButton } from "@/components/SessionBackButton";
import { TodayOverviewHeader } from "@/components/today/TodayScreenFamily";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import type { HeaderInfoRailItem } from "@/lib/header-info-rail";

export function SessionHeaderControls({
  routineName,
  sessionDayName,
  infoItems,
  backHref,
  statusBadge,
}: {
  routineName: string;
  sessionDayName: string;
  infoItems: HeaderInfoRailItem[];
  backHref?: string;
  statusBadge?: ReactNode;
}) {
  const titleNode = <RoutineDayHeaderTitle leadingItems={[routineName.trim() || "Routine"]} dayLabel={sessionDayName} dayLabelOrder="day-first" />;
  const subtitleNode = infoItems.length > 0 ? (
    <HeaderInfoRail
      items={infoItems}
      ariaLabel="Current session summary"
      behavior="rotate-single"
      className="justify-center text-center"
    />
  ) : undefined;

  return (
    <div className="relative">
      {statusBadge ? (
        <div className="pointer-events-none absolute left-1 top-1 z-10 hidden min-[420px]:block">
          {statusBadge}
        </div>
      ) : null}
      <TodayOverviewHeader
        title={titleNode}
        subtitle={subtitleNode}
        action={<SessionBackButton href={backHref} />}
        align="center"
        className="px-1"
        separatorClassName="!mt-2 !h-[2px] !bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.24),rgb(var(--accent-divider-rgb)/0.98),rgb(var(--accent-divider-rgb)/0.24))] !shadow-[0_0_18px_rgb(var(--accent-divider-rgb)/0.24)]"
      />
    </div>
  );
}
