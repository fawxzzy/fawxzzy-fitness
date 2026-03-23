import "server-only";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ROUTINE_START_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type RoutineStartWeekday = (typeof ROUTINE_START_WEEKDAYS)[number];

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function getTodayDateInTimeZone(timeZone: string) {
  const parts = getDatePartsInTimeZone(new Date(), timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${parts.year}-${month}-${day}`;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

export function getTimeZoneDayWindow(timeZone: string, date = new Date()) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const startGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
  const startOffset = getTimeZoneOffsetMs(startGuess, timeZone);
  const start = new Date(startGuess.getTime() - startOffset);

  const nextGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0));
  const nextOffset = getTimeZoneOffsetMs(nextGuess, timeZone);
  const end = new Date(nextGuess.getTime() - nextOffset);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function parseDateStringAsUtc(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatUtcDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getRoutineDayComputation(params: {
  cycleLengthDays: number;
  startDate: string;
  profileTimeZone: string;
}) {
  const { cycleLengthDays, startDate, profileTimeZone } = params;
  const todayDate = getTodayDateInTimeZone(profileTimeZone);

  const todayTs = parseDateStringAsUtc(todayDate);
  const startTs = parseDateStringAsUtc(startDate);
  const daysSinceStart = Math.floor((todayTs - startTs) / MS_PER_DAY);
  const normalized = ((daysSinceStart % cycleLengthDays) + cycleLengthDays) % cycleLengthDays;

  return {
    todayDate,
    daysSinceStart,
    dayIndex: normalized + 1,
  };
}

export function createRoutineDaySeeds(cycleLengthDays: number, userId: string, routineId: string) {
  return createRoutineDaySeedsFromStartDate(cycleLengthDays, userId, routineId, null);
}

function getWeekdayNameFromUtcDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date);
}

export function getRoutineStartWeekdayFromDate(startDate: string | null | undefined): RoutineStartWeekday | null {
  if (!startDate) {
    return null;
  }

  const timestamp = Date.parse(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(timestamp)).toLowerCase();
  return ROUTINE_START_WEEKDAYS.includes(weekday as RoutineStartWeekday) ? (weekday as RoutineStartWeekday) : null;
}

export function getRoutineStartDateForWeekday(params: {
  cycleLengthDays: number;
  startWeekday: RoutineStartWeekday;
  timeZone: string;
  existingStartDate?: string | null;
}) {
  const { cycleLengthDays, startWeekday, timeZone, existingStartDate } = params;
  const existingWeekday = getRoutineStartWeekdayFromDate(existingStartDate);

  if (existingStartDate && existingWeekday === startWeekday) {
    return existingStartDate;
  }

  const todayDate = getTodayDateInTimeZone(timeZone);
  const todayTs = parseDateStringAsUtc(todayDate);
  const todayWeekday = getRoutineStartWeekdayFromDate(todayDate);

  if (!todayWeekday) {
    return todayDate;
  }

  const targetIndex = ROUTINE_START_WEEKDAYS.indexOf(startWeekday);
  const todayIndex = ROUTINE_START_WEEKDAYS.indexOf(todayWeekday);
  const daysSinceTargetWeekday = (todayIndex - targetIndex + ROUTINE_START_WEEKDAYS.length) % ROUTINE_START_WEEKDAYS.length;
  const targetTs = todayTs - (daysSinceTargetWeekday * MS_PER_DAY);

  if (!existingStartDate) {
    return formatUtcDate(targetTs);
  }

  const existingComputation = getRoutineDayComputation({
    cycleLengthDays,
    startDate: existingStartDate,
    profileTimeZone: timeZone,
  });

  const dayOffsetFromStart = existingComputation.dayIndex - 1;
  return formatUtcDate(targetTs - (dayOffsetFromStart * MS_PER_DAY));
}

export function getRoutineDayNamesFromStartDate(cycleLengthDays: number, startDate: string | null) {
  const startTimestamp = startDate ? Date.parse(`${startDate}T00:00:00Z`) : Number.NaN;
  const canUseWeekdayNames = Number.isFinite(startTimestamp);

  return Array.from({ length: cycleLengthDays }, (_, index) => {
    if (!canUseWeekdayNames) {
      return `Day ${index + 1}`;
    }
    return getWeekdayNameFromUtcDate(new Date(startTimestamp + (index * MS_PER_DAY)));
  });
}

export function createRoutineDaySeedsFromStartDate(cycleLengthDays: number, userId: string, routineId: string, startDate: string | null) {
  const dayNames = getRoutineDayNamesFromStartDate(cycleLengthDays, startDate);

  return Array.from({ length: cycleLengthDays }, (_, index) => ({
    day_index: index + 1,
    user_id: userId,
    routine_id: routineId,
    name: dayNames[index],
    is_rest: false,
  }));
}


export function formatRepTarget(minReps: number | null, maxReps: number | null, fallbackReps: number | null) {
  const resolvedMin = minReps ?? fallbackReps ?? null;
  const resolvedMax = maxReps ?? fallbackReps ?? null;

  if (resolvedMin !== null && resolvedMax !== null) {
    if (resolvedMin === resolvedMax) {
      return `Reps: ${resolvedMin}`;
    }
    return `Reps: ${resolvedMin}–${resolvedMax}`;
  }

  if (resolvedMin !== null) {
    return `Reps: ${resolvedMin}`;
  }

  if (resolvedMax !== null) {
    return `Reps: ${resolvedMax}`;
  }

  return "Reps: -";
}
