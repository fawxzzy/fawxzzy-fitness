import { addDaysToDateString, getCurrentCycleOccurrenceContext } from "@/lib/routines";

export type CurrentCycleWindow = {
  startDate: string;
  endDate: string;
  nextStartDate: string;
  queryStartIso: string;
  queryEndExclusiveIso: string;
  label: string;
};

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildCurrentCycleWindow(args: {
  cycleLengthDays: number | null | undefined;
  startDate: string | null | undefined;
  profileTimeZone: string | null | undefined;
  referenceDate?: string | null;
}) {
  const cycleLengthDays = Number.isFinite(args.cycleLengthDays) && Number(args.cycleLengthDays) > 0
    ? Math.max(1, Math.floor(Number(args.cycleLengthDays)))
    : 0;
  const startDate = typeof args.startDate === "string" ? args.startDate.trim() : "";
  const profileTimeZone = typeof args.profileTimeZone === "string" && args.profileTimeZone.trim().length > 0
    ? args.profileTimeZone.trim()
    : "America/New_York";

  if (cycleLengthDays <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return null;
  }

  const cycleContext = getCurrentCycleOccurrenceContext({
    cycleLengthDays,
    startDate,
    profileTimeZone,
    dayIndexes: [1],
    referenceDate: args.referenceDate ?? null,
  });
  const currentCycleStartDate = cycleContext.currentCycleStartDate;
  const nextCycleStartDate = addDaysToDateString(currentCycleStartDate, cycleLengthDays);
  const currentCycleEndDate = addDaysToDateString(nextCycleStartDate, -1);

  return {
    startDate: currentCycleStartDate,
    endDate: currentCycleEndDate,
    nextStartDate: nextCycleStartDate,
    queryStartIso: `${currentCycleStartDate}T00:00:00.000Z`,
    queryEndExclusiveIso: `${nextCycleStartDate}T00:00:00.000Z`,
    label: `${formatDayKey(currentCycleStartDate)} - ${formatDayKey(currentCycleEndDate)}`,
  } satisfies CurrentCycleWindow;
}
