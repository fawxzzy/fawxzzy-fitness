import { resolveRoutineSchedule, type RoutineScheduleResolution } from "./routine-schedule-resolution";

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

function getRoutineScheduleAnchorWeekdayIndex(weekday: RoutineStartWeekday | null | undefined) {
  switch (weekday) {
  case "sunday":
    return 0;
  case "monday":
    return 1;
  case "tuesday":
    return 2;
  case "wednesday":
    return 3;
  case "thursday":
    return 4;
  case "friday":
    return 5;
  case "saturday":
    return 6;
  default:
    return null;
  }
}

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

export function resolveRoutineScheduleForToday(params: {
  cycleLengthDays: number;
  scheduleMode?: "weekday_anchored" | "rolling_n_day" | null;
  startDate: string;
  startWeekday?: RoutineStartWeekday | null;
  profileTimeZone: string;
}): {
  todayDate: string;
  resolution: RoutineScheduleResolution;
  dayIndex: number | null;
} {
  const todayDate = getTodayDateInTimeZone(params.profileTimeZone);
  const resolution = resolveRoutineSchedule({
    scheduleMode: params.scheduleMode,
    cycleLengthDays: params.cycleLengthDays,
    anchorWeekday: getRoutineScheduleAnchorWeekdayIndex(params.startWeekday),
    anchorDate: params.startDate,
    today: todayDate,
  });

  return {
    todayDate,
    resolution,
    dayIndex: resolution.status === "scheduled" ? resolution.cycleDayNumber : null,
  };
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
  const normalizedDate = normalizeDateOnlyString(dateString);
  if (!normalizedDate) {
    return Number.NaN;
  }

  const [year, month, day] = normalizedDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function normalizeDateOnlyString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function formatUtcDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function addDaysToDateString(dateString: string, days: number) {
  return formatUtcDate(parseDateStringAsUtc(dateString) + (days * MS_PER_DAY));
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function normalizeCycleDayOffset(value: number, cycleLengthDays: number) {
  return ((value % cycleLengthDays) + cycleLengthDays) % cycleLengthDays;
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
  const normalized = normalizeCycleDayOffset(daysSinceStart, cycleLengthDays);

  return {
    todayDate,
    daysSinceStart,
    dayIndex: normalized + 1,
  };
}

export function getRoutineCycleOccurrence(params: {
  cycleLengthDays: number;
  startDate: string;
  profileTimeZone: string;
  dayIndex: number;
  referenceDate?: string | null;
}) {
  const { cycleLengthDays, startDate, profileTimeZone, dayIndex } = params;
  const safeCycleLengthDays = Number.isFinite(cycleLengthDays) && cycleLengthDays > 0
    ? Math.floor(cycleLengthDays)
    : 1;
  const safeDayIndex = Number.isFinite(dayIndex) && dayIndex > 0
    ? Math.min(Math.floor(dayIndex), safeCycleLengthDays)
    : 1;
  const referenceDate = params.referenceDate || getTodayDateInTimeZone(profileTimeZone);
  const referenceTs = parseDateStringAsUtc(referenceDate);
  const startTs = parseDateStringAsUtc(startDate);
  const daysSinceStart = Math.floor((referenceTs - startTs) / MS_PER_DAY);
  const currentDayIndex = normalizeCycleDayOffset(daysSinceStart, safeCycleLengthDays) + 1;
  const daysUntilOccurrence = normalizeCycleDayOffset(safeDayIndex - currentDayIndex, safeCycleLengthDays);
  const occurrenceDate = formatUtcDate(referenceTs + (daysUntilOccurrence * MS_PER_DAY));
  const occurrenceDaysSinceStart = daysSinceStart + daysUntilOccurrence;

  return {
    referenceDate,
    daysSinceStart,
    currentDayIndex,
    dayIndex: safeDayIndex,
    occurrenceDate,
    occurrenceWeekdayShort: getWeekdayNameFromUtcDate(new Date(parseDateStringAsUtc(occurrenceDate)), "short"),
    occurrenceLabel: formatRoutineOccurrenceDateLabel(occurrenceDate),
    cycleRotationIndex: Math.floor(occurrenceDaysSinceStart / safeCycleLengthDays),
  };
}

export function getCurrentCycleOccurrenceContext(params: {
  cycleLengthDays: number;
  startDate: string;
  profileTimeZone: string;
  dayIndexes: number[];
  referenceDate?: string | null;
}) {
  const safeCycleLengthDays = Number.isFinite(params.cycleLengthDays) && params.cycleLengthDays > 0
    ? Math.floor(params.cycleLengthDays)
    : 1;
  const todayDate = params.referenceDate || getTodayDateInTimeZone(params.profileTimeZone);
  const todayTs = parseDateStringAsUtc(todayDate);
  const startTs = parseDateStringAsUtc(params.startDate);
  const daysSinceStart = Math.floor((todayTs - startTs) / MS_PER_DAY);
  const currentCycleStartOffset = Math.floor(daysSinceStart / safeCycleLengthDays) * safeCycleLengthDays;
  const currentCycleStartDate = addDaysToDateString(params.startDate, currentCycleStartOffset);
  const occurrenceDateByDayIndex = new Map<number, string>();

  for (const dayIndex of params.dayIndexes) {
    if (!Number.isFinite(dayIndex) || dayIndex <= 0) {
      continue;
    }

    occurrenceDateByDayIndex.set(dayIndex, addDaysToDateString(currentCycleStartDate, dayIndex - 1));
  }

  return {
    todayDate,
    currentCycleStartDate,
    occurrenceDateByDayIndex,
    queryStartDate: addDaysToDateString(currentCycleStartDate, -1),
    queryEndDate: addDaysToDateString(todayDate, 2),
  };
}

export function resolveCompletedRoutineDayIndexesForOccurrence(params: {
  sessions: Array<{ routine_day_index: number | null; performed_at: string | null }>;
  occurrenceDateByDayIndex: Map<number, string>;
  timeZone: string;
}) {
  return [...new Set(
    params.sessions
      .filter((session) => {
        const dayIndex = session.routine_day_index;
        if (typeof dayIndex !== "number" || !Number.isFinite(dayIndex) || !session.performed_at) {
          return false;
        }

        const occurrenceDate = params.occurrenceDateByDayIndex.get(dayIndex);
        const performedDate = formatDateInTimeZone(new Date(session.performed_at), params.timeZone);
        return Boolean(occurrenceDate && performedDate === occurrenceDate);
      })
      .map((session) => session.routine_day_index)
      .filter((value): value is number => Number.isFinite(value)),
  )];
}

export function createRoutineDaySeeds(cycleLengthDays: number, userId: string, routineId: string) {
  return createRoutineDaySeedsFromStartDate(cycleLengthDays, userId, routineId, null);
}

function getWeekdayNameFromUtcDate(date: Date, weekday: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-US", { weekday, timeZone: "UTC" }).format(date);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getRoutineStartWeekdayFromDate(startDate: string | null | undefined): RoutineStartWeekday | null {
  const normalizedDate = normalizeDateOnlyString(startDate);
  if (!normalizedDate) {
    return null;
  }

  const timestamp = Date.parse(`${normalizedDate}T00:00:00Z`);
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
  const normalizedDate = normalizeDateOnlyString(startDate);
  const startTimestamp = normalizedDate ? Date.parse(`${normalizedDate}T00:00:00Z`) : Number.NaN;
  const canUseWeekdayNames = Number.isFinite(startTimestamp);

  return Array.from({ length: cycleLengthDays }, (_, index) => {
    if (!canUseWeekdayNames) {
      return `Day ${index + 1}`;
    }
    return getWeekdayNameFromUtcDate(new Date(startTimestamp + (index * MS_PER_DAY)));
  });
}

export function getRoutineDayWeekdayLabel(dayIndex: number, startDate: string | null | undefined, weekday: "long" | "short" = "short") {
  if (!Number.isFinite(dayIndex) || dayIndex < 1) {
    return "Day";
  }

  const normalizedDate = normalizeDateOnlyString(startDate);
  const startTimestamp = normalizedDate ? Date.parse(`${normalizedDate}T00:00:00Z`) : Number.NaN;
  if (!Number.isFinite(startTimestamp)) {
    return `Day ${dayIndex}`;
  }

  return getWeekdayNameFromUtcDate(new Date(startTimestamp + ((dayIndex - 1) * MS_PER_DAY)), weekday);
}

export function getRoutineDayResolvedWeekdayLabel(params: {
  dayIndex: number;
  startDate: string | null | undefined;
  cycleLengthDays?: number | null;
  scheduleMode?: "weekday_anchored" | "rolling_n_day" | null;
  profileTimeZone?: string | null;
  referenceDate?: string | null;
  weekday?: "long" | "short";
}) {
  const weekday = params.weekday ?? "short";
  const normalizedTimeZone = params.profileTimeZone?.trim();
  const normalizedCycleLengthDays = Number.isFinite(params.cycleLengthDays ?? null) && Number(params.cycleLengthDays) > 0
    ? Math.floor(Number(params.cycleLengthDays))
    : null;

  if (
    params.scheduleMode === "rolling_n_day"
    && normalizedTimeZone
    && normalizedCycleLengthDays
    && typeof params.startDate === "string"
    && params.startDate.trim().length > 0
  ) {
    const occurrence = getRoutineCycleOccurrence({
      cycleLengthDays: normalizedCycleLengthDays,
      startDate: params.startDate,
      profileTimeZone: normalizedTimeZone,
      dayIndex: params.dayIndex,
      referenceDate: params.referenceDate ?? null,
    });

    return getWeekdayNameFromUtcDate(new Date(parseDateStringAsUtc(occurrence.occurrenceDate)), weekday);
  }

  return getRoutineDayWeekdayLabel(params.dayIndex, params.startDate, weekday);
}

export function formatRoutineOccurrenceDateLabel(dateString: string) {
  const timestamp = Date.parse(`${dateString}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function isRoutineDayDefaultName(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
}) {
  const trimmedName = args.name?.trim() ?? "";
  if (trimmedName.length === 0) {
    return true;
  }

  const normalizedName = trimmedName.toLowerCase();
  const longWeekday = getRoutineDayWeekdayLabel(args.dayIndex, args.startDate, "long").toLowerCase();
  const shortWeekday = getRoutineDayWeekdayLabel(args.dayIndex, args.startDate, "short").toLowerCase();

  return normalizedName === String(args.dayIndex)
    || normalizedName === `day ${args.dayIndex}`
    || normalizedName === longWeekday
    || normalizedName === shortWeekday;
}

function stripRoutineDayWeekdayPrefix(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
}) {
  const trimmedName = args.name?.trim() ?? "";
  if (trimmedName.length === 0) {
    return "";
  }

  const weekdayLabels = [
    getRoutineDayWeekdayLabel(args.dayIndex, args.startDate, "short"),
    getRoutineDayWeekdayLabel(args.dayIndex, args.startDate, "long"),
  ];

  for (const weekdayLabel of weekdayLabels) {
    const separatorPattern = String.raw`(?:\u00B7|\u00C2\u00B7|\u00C3\u0082\u00C2\u00B7|\||-)`;
    const prefixedLabelMatch = trimmedName.match(new RegExp(`^${escapeRegExp(weekdayLabel)}\\s*${separatorPattern}\\s*(.+)$`, "i"));
    const remainder = prefixedLabelMatch?.[1]?.trim();
    if (remainder) {
      return remainder;
    }
  }

  return trimmedName;
}

export function getRoutineDayEditableName(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
}) {
  const trimmedName = stripRoutineDayWeekdayPrefix(args);
  return isRoutineDayDefaultName({ ...args, name: trimmedName }) ? "" : trimmedName;
}

export function hasCustomRoutineDayTitle(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
}) {
  return getRoutineDayEditableName(args).length > 0;
}

export function formatRoutineDayDisplayName(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
  weekday?: "long" | "short";
}) {
  const weekdayLabel = getRoutineDayWeekdayLabel(args.dayIndex, args.startDate, args.weekday ?? "short");
  const customName = getRoutineDayEditableName(args);
  if (customName) {
    return `${weekdayLabel} | ${customName}`;
  }
  return weekdayLabel;
}

export function formatRoutineDayStableDisplayName(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
}) {
  return getRoutineDayEditableName(args) || `Day ${args.dayIndex}`;
}

export function formatRoutineDayOccurrenceDisplayName(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
  occurrenceLabel: string | null | undefined;
}) {
  const occurrenceLabel = args.occurrenceLabel?.trim();
  if (!occurrenceLabel) {
    return formatRoutineDayDisplayName(args);
  }

  const stableName = formatRoutineDayStableDisplayName(args);
  return `${stableName} | ${occurrenceLabel}`;
}

export function createRoutineDaySeedsFromStartDate(cycleLengthDays: number, userId: string, routineId: string, _startDate: string | null) {
  return Array.from({ length: cycleLengthDays }, (_, index) => ({
    day_index: index + 1,
    user_id: userId,
    routine_id: routineId,
    name: String(index + 1),
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
