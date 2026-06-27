const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_MONTHLY_SCHEDULE_DAYS = 31;

export const ROUTINE_SCHEDULE_MODES = [
  "weekday_anchored",
  "rolling_n_day",
] as const;

export type RoutineScheduleMode = (typeof ROUTINE_SCHEDULE_MODES)[number];
export type RoutineScheduleRepeatTier = "weekly" | "biweekly" | "monthly";
export type RoutineScheduleResolutionReason =
  | "outside_active_weekdays"
  | "invalid_config"
  | "outside_cycle";

export type RoutineScheduleResolutionInput = {
  scheduleMode?: RoutineScheduleMode | null;
  cycleLengthDays?: number | null;
  weekStartsOn?: number | null;
  anchorWeekday?: number | null;
  anchorDate?: string | Date | null;
  today: string | Date;
};

export type RoutineScheduleResolution =
  | {
      status: "scheduled";
      scheduleMode: RoutineScheduleMode;
      cycleDayIndex: number;
      cycleDayNumber: number;
      repeatTier?: RoutineScheduleRepeatTier;
      effectiveCycleLengthDays: number;
    }
  | {
      status: "unscheduled";
      scheduleMode: RoutineScheduleMode;
      reason: RoutineScheduleResolutionReason;
      repeatTier?: RoutineScheduleRepeatTier;
      effectiveCycleLengthDays?: number;
    };

function normalizeRoutineScheduleMode(value: unknown): RoutineScheduleMode {
  return ROUTINE_SCHEDULE_MODES.includes(value as RoutineScheduleMode)
    ? value as RoutineScheduleMode
    : "weekday_anchored";
}

function normalizeWeekday(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6
    ? value
    : null;
}

function normalizeCycleLengthDays(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

function clampMonthlyCycleLength(value: number) {
  return Math.min(value, MAX_MONTHLY_SCHEDULE_DAYS);
}

function resolveRepeatTier(cycleLengthDays: number): RoutineScheduleRepeatTier {
  if (cycleLengthDays <= 7) {
    return "weekly";
  }

  if (cycleLengthDays <= 14) {
    return "biweekly";
  }

  return "monthly";
}

function resolveRepeatSpanDays(args: {
  repeatTier: RoutineScheduleRepeatTier;
  cycleLengthDays: number;
}) {
  switch (args.repeatTier) {
  case "weekly":
    return 7;
  case "biweekly":
    return 14;
  case "monthly":
    return clampMonthlyCycleLength(Math.max(args.cycleLengthDays, MAX_MONTHLY_SCHEDULE_DAYS));
  }
}

function parseDateInput(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? value.toISOString().slice(0, 10)
      : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const normalized = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(`${normalized}T00:00:00Z`);
  return Number.isFinite(timestamp) ? normalized : null;
}

function parseDateStringAsUtc(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function getUtcWeekday(dateString: string) {
  return new Date(parseDateStringAsUtc(dateString)).getUTCDay();
}

function normalizeOffset(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

function getDaysBetween(anchorDate: string, today: string) {
  return Math.floor((parseDateStringAsUtc(today) - parseDateStringAsUtc(anchorDate)) / MS_PER_DAY);
}

function resolveAnchorDateForWeekdayMode(args: {
  anchorDate: string | null;
  anchorWeekday: number | null;
  today: string;
  weekStartsOn: number | null;
}) {
  if (args.anchorDate) {
    return args.anchorDate;
  }

  if (args.anchorWeekday === null) {
    return null;
  }

  const todayWeekday = getUtcWeekday(args.today);
  const normalizedWeekStartsOn = args.weekStartsOn ?? 0;
  if (normalizedWeekStartsOn < 0 || normalizedWeekStartsOn > 6) {
    return null;
  }

  const daysSinceAnchorWeekday = normalizeOffset(todayWeekday - args.anchorWeekday, 7);
  const anchorTimestamp = parseDateStringAsUtc(args.today) - (daysSinceAnchorWeekday * MS_PER_DAY);
  return new Date(anchorTimestamp).toISOString().slice(0, 10);
}

export function resolveRoutineSchedule(input: RoutineScheduleResolutionInput): RoutineScheduleResolution {
  const scheduleMode = normalizeRoutineScheduleMode(input.scheduleMode);
  const cycleLengthDays = normalizeCycleLengthDays(input.cycleLengthDays);
  const today = parseDateInput(input.today);

  if (!today || cycleLengthDays === null) {
    return {
      status: "unscheduled",
      scheduleMode,
      reason: "invalid_config",
    };
  }

  if (scheduleMode === "rolling_n_day") {
    const anchorDate = parseDateInput(input.anchorDate);
    if (!anchorDate) {
      return {
        status: "unscheduled",
        scheduleMode,
        reason: "invalid_config",
      };
    }

    const cycleDayIndex = normalizeOffset(getDaysBetween(anchorDate, today), cycleLengthDays);
    return {
      status: "scheduled",
      scheduleMode,
      cycleDayIndex,
      cycleDayNumber: cycleDayIndex + 1,
      effectiveCycleLengthDays: cycleLengthDays,
    };
  }

  const anchorWeekday = normalizeWeekday(input.anchorWeekday);
  const repeatTier = resolveRepeatTier(cycleLengthDays);
  const effectiveCycleLengthDays = repeatTier === "monthly"
    ? clampMonthlyCycleLength(cycleLengthDays)
    : cycleLengthDays;
  const repeatSpanDays = resolveRepeatSpanDays({
    repeatTier,
    cycleLengthDays: effectiveCycleLengthDays,
  });
  const anchorDate = resolveAnchorDateForWeekdayMode({
    anchorDate: parseDateInput(input.anchorDate),
    anchorWeekday,
    today,
    weekStartsOn: normalizeWeekday(input.weekStartsOn),
  });

  if (!anchorDate) {
    return {
      status: "unscheduled",
      scheduleMode,
      reason: "invalid_config",
      repeatTier,
      effectiveCycleLengthDays,
    };
  }

  if (anchorWeekday !== null && getUtcWeekday(anchorDate) !== anchorWeekday) {
    return {
      status: "unscheduled",
      scheduleMode,
      reason: "invalid_config",
      repeatTier,
      effectiveCycleLengthDays,
    };
  }

  const daysSinceAnchor = getDaysBetween(anchorDate, today);
  const positionInRepeatSpan = normalizeOffset(daysSinceAnchor, repeatSpanDays);
  if (positionInRepeatSpan >= effectiveCycleLengthDays) {
    return {
      status: "unscheduled",
      scheduleMode,
      reason: repeatTier === "weekly" ? "outside_active_weekdays" : "outside_cycle",
      repeatTier,
      effectiveCycleLengthDays,
    };
  }

  return {
    status: "scheduled",
    scheduleMode,
    cycleDayIndex: positionInRepeatSpan,
    cycleDayNumber: positionInRepeatSpan + 1,
    repeatTier,
    effectiveCycleLengthDays,
  };
}
