const SIMPLE_ROUTINE_TIMEZONE_CHOICES = [
  { label: "Pacific", value: "America/Los_Angeles", aliases: ["America/Vancouver"] },
  { label: "Mountain", value: "America/Denver", aliases: [] },
  { label: "Central", value: "America/Chicago", aliases: ["America/Mexico_City"] },
  { label: "Eastern", value: "America/New_York", aliases: ["America/Toronto"] },
  { label: "UTC", value: "UTC", aliases: [] },
] as const;

const LEGACY_ROUTINE_TIMEZONES = [
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Athens",
  "Europe/Moscow",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export const ROUTINE_TIMEZONE_OPTIONS = SIMPLE_ROUTINE_TIMEZONE_CHOICES.map((choice) => choice.value);

const ROUTINE_TIMEZONE_ALIASES = new Map<string, (typeof ROUTINE_TIMEZONE_OPTIONS)[number]>();

for (const choice of SIMPLE_ROUTINE_TIMEZONE_CHOICES) {
  ROUTINE_TIMEZONE_ALIASES.set(choice.value, choice.value);
  for (const alias of choice.aliases) {
    ROUTINE_TIMEZONE_ALIASES.set(alias, choice.value);
  }
}

for (const legacyTimeZone of LEGACY_ROUTINE_TIMEZONES) {
  ROUTINE_TIMEZONE_ALIASES.set(legacyTimeZone, "UTC");
}

export function isRoutineTimezone(value: string) {
  return ROUTINE_TIMEZONE_ALIASES.has(value);
}

export function getRoutineTimezoneLabel(value: (typeof ROUTINE_TIMEZONE_OPTIONS)[number]) {
  return SIMPLE_ROUTINE_TIMEZONE_CHOICES.find((choice) => choice.value === value)?.label ?? value;
}

export function normalizeRoutineTimezone(value: string | null | undefined) {
  if (!value) {
    return "America/New_York" as const;
  }

  return ROUTINE_TIMEZONE_ALIASES.get(value) ?? ("America/New_York" as const);
}

export function toCanonicalRoutineTimezone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return ROUTINE_TIMEZONE_ALIASES.get(value) ?? null;
}

export const DEFAULT_HISTORY_TIMEZONE = "America/New_York";

function isValidIanaTimeZone(value: string | null | undefined): value is string {
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
