import { getWeeklyProgressDayKey } from "@/lib/history-weekly-progress";
import { DEFAULT_HISTORY_TIMEZONE, isValidIanaTimeZone } from "@/lib/timezones";

/**
 * Local-day bucketing for Exercise info (PR history, chart axis, day groups, last-performed labels).
 *
 * History buckets a session by the day it happened in the user's own zone (`getWeeklyProgressDayKey` with the
 * zone from `resolveHistoryTimeZone`). Exercise info used to slice the UTC ISO string instead, so a session
 * after 19:00 US Eastern (00:00 UTC, EST) landed on the next day ("Nov 13" here, "Nov 12" in History). This
 * module is the one place Exercise info turns an instant into a day, and it delegates to History's function so
 * there is a single rule. A day key is `YYYY-MM-DD`; "" means the value was not a usable instant.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function safeTimeZone(timeZone: string | null | undefined) {
  return isValidIanaTimeZone(timeZone) ? timeZone.trim() : DEFAULT_HISTORY_TIMEZONE;
}

/** Local day key of an instant in `timeZone`. A value that is already a plain `YYYY-MM-DD` day key is returned as is. */
export function getExerciseInfoDayKey(value: string | null | undefined, timeZone: string | null | undefined): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return getWeeklyProgressDayKey(trimmed, safeTimeZone(timeZone)) ?? "";
}

/**
 * "Nov 12" label for a day key. The key is a calendar date, not an instant, so it is formatted in UTC: noon UTC
 * of that date is the same calendar day in every runtime zone a server or browser can be in.
 */
export function formatExerciseInfoDayKeyLabel(dayKey: string): string {
  const timestamp = Date.parse(`${dayKey}T12:00:00.000Z`);
  if (!DATE_ONLY_PATTERN.test(dayKey) || !Number.isFinite(timestamp)) {
    return dayKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

/** "Nov 12" label for the local day an instant falls on in `timeZone`; "Unknown" when there is no value. */
export function formatExerciseInfoDayLabel(value: string | null | undefined, timeZone: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const dayKey = getExerciseInfoDayKey(value, timeZone);
  return dayKey ? formatExerciseInfoDayKeyLabel(dayKey) : value;
}
