const SIMPLE_ROUTINE_TIMEZONE_CHOICES = [
  { label: "Pacific", value: "America/Los_Angeles", aliases: ["America/Vancouver"] },
  { label: "Mountain", value: "America/Denver", aliases: [] },
  { label: "Central", value: "America/Chicago", aliases: [] },
  { label: "Eastern", value: "America/New_York", aliases: ["America/Toronto"] },
  { label: "UTC", value: "UTC", aliases: [] },
] as const;

export const ROUTINE_TIMEZONE_OPTIONS = SIMPLE_ROUTINE_TIMEZONE_CHOICES.map((choice) => choice.value);

const ROUTINE_TIMEZONE_ALIASES = new Map<string, (typeof ROUTINE_TIMEZONE_OPTIONS)[number]>();

for (const choice of SIMPLE_ROUTINE_TIMEZONE_CHOICES) {
  ROUTINE_TIMEZONE_ALIASES.set(choice.value, choice.value);
  for (const alias of choice.aliases) {
    ROUTINE_TIMEZONE_ALIASES.set(alias, choice.value);
  }
}

export function isValidIanaTimeZone(value: string | null | undefined): value is string {
  if (!value || !value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.trim() });
    return true;
  } catch {
    return false;
  }
}

// Routine timezones are any valid IANA zone: the device zone is stored as is, so Phoenix, Honolulu, London,
// Tokyo, ... bucket on their real local days. The five choices above are only the picker presets, and their
// aliases (Toronto, Vancouver) still fold into the preset with the same day boundaries. Mexico City is NOT an
// alias of Central: it has no DST (UTC-6 year round), so it is kept as its own zone.
// Previously a fixed list of European/Asian/Australian zones was collapsed to UTC and every other unknown
// zone to America/New_York; stored values are unchanged, they are simply no longer rewritten on read.
export function isRoutineTimezone(value: string) {
  return ROUTINE_TIMEZONE_ALIASES.has(value) || isValidIanaTimeZone(value);
}

export function getRoutineTimezoneLabel(value: string) {
  return SIMPLE_ROUTINE_TIMEZONE_CHOICES.find((choice) => choice.value === value)?.label ?? value;
}

export function toCanonicalRoutineTimezone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const alias = ROUTINE_TIMEZONE_ALIASES.get(value);
  if (alias) {
    return alias;
  }

  return isValidIanaTimeZone(value) ? value.trim() : null;
}

export function normalizeRoutineTimezone(value: string | null | undefined): string {
  return toCanonicalRoutineTimezone(value) ?? DEFAULT_HISTORY_TIMEZONE;
}

// Matches the app's long-standing fallback; the DB column default (America/Toronto, 002_routines.sql) is
// day-boundary-equivalent to it, and nothing relies on that default because profile bootstrap writes this value.
export const DEFAULT_HISTORY_TIMEZONE = "America/New_York";

/**
 * The single timezone History uses to bucket sessions into local days (streak, heatmap, calendar, weekly and
 * monthly progress). The active routine's timezone is device-derived when the routine is saved, so it is the
 * user's real local zone. `profiles.timezone` is only a fallback: it was historically captured from the server
 * runtime (UTC on Vercel) and is never user-edited, so it must not outrank the routine.
 */
export function resolveHistoryTimeZone(args: {
  activeRoutineTimeZone?: string | null;
  profileTimeZone?: string | null;
}) {
  if (isValidIanaTimeZone(args.activeRoutineTimeZone)) {
    return args.activeRoutineTimeZone.trim();
  }
  if (isValidIanaTimeZone(args.profileTimeZone)) {
    return args.profileTimeZone.trim();
  }
  return DEFAULT_HISTORY_TIMEZONE;
}
