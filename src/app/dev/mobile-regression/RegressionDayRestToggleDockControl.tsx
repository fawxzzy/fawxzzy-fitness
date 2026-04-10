"use client";

import { DayRestToggleDockControl } from "@/components/day/DayRestToggleDockControl";

export function RegressionDayRestToggleDockControl({ isRest }: { isRest: boolean }) {
  return <DayRestToggleDockControl isRest={isRest} onToggle={() => {}} />;
}
