import { DEFAULT_HISTORY_TIMEZONE, getRoutineTimezoneLabel, isValidIanaTimeZone, ROUTINE_TIMEZONE_OPTIONS } from "@/lib/timezones";

/**
 * Settings "Units & time zone" (wave 2 L-C, SIMPLIFY #10): the person's weight unit, distance unit and time zone,
 * stored on `fitness.profiles` (preferred_weight_unit, preferred_distance_unit, timezone; all NOT NULL with defaults).
 * New routines and the starter plans read these as their defaults. Routines already made keep their own zone and units.
 * Pure helpers here so the server action, the panel and the tests agree on one set of rules.
 */
export type WeightUnit = "lbs" | "kg";
export type DistanceUnit = "mi" | "km";

export type UnitsSettingsValues = {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  timeZone: string;
};

export const UNITS_SETTINGS_DEFAULTS: UnitsSettingsValues = {
  weightUnit: "lbs",
  distanceUnit: "mi",
  timeZone: DEFAULT_HISTORY_TIMEZONE,
};

// Zones a fresh profile can carry without the person ever choosing one: the app's bootstrap value, the DB column
// default (America/Toronto) and the old server-runtime capture (UTC on Vercel).
const UNTOUCHED_PROFILE_ZONES = new Set([DEFAULT_HISTORY_TIMEZONE, "America/Toronto", "UTC", "Etc/UTC"]);

// Regions that weigh in pounds and measure road distance in miles; the UK weighs in kg but drives in miles.
const POUND_AND_MILE_REGIONS = new Set(["US", "LR", "MM"]);
const MILE_ONLY_REGIONS = new Set(["GB"]);

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "lbs" || value === "kg";
}

export function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === "mi" || value === "km";
}

/** Reads the saved profile values, falling back to the defaults for anything missing or unexpected. */
export function readUnitsSettings(profile: {
  preferred_weight_unit?: string | null;
  preferred_distance_unit?: string | null;
  timezone?: string | null;
}): UnitsSettingsValues {
  return {
    weightUnit: isWeightUnit(profile.preferred_weight_unit) ? profile.preferred_weight_unit : UNITS_SETTINGS_DEFAULTS.weightUnit,
    distanceUnit: isDistanceUnit(profile.preferred_distance_unit) ? profile.preferred_distance_unit : UNITS_SETTINGS_DEFAULTS.distanceUnit,
    timeZone: isValidIanaTimeZone(profile.timezone) ? profile.timezone.trim() : UNITS_SETTINGS_DEFAULTS.timeZone,
  };
}

/** Validates a submitted form. Errors are plain sentences for the in-flow notice (toast), never inline red text. */
export function parseUnitsSettingsForm(formData: { get(name: string): FormDataEntryValue | null }):
  | { ok: true; values: UnitsSettingsValues }
  | { ok: false; error: string } {
  const weightUnit = String(formData.get("weightUnit") ?? "");
  const distanceUnit = String(formData.get("distanceUnit") ?? "");
  const timeZone = String(formData.get("timeZone") ?? "").trim();

  if (!isWeightUnit(weightUnit)) {
    return { ok: false, error: "Pick lb or kg for weight." };
  }
  if (!isDistanceUnit(distanceUnit)) {
    return { ok: false, error: "Pick mi or km for distance." };
  }
  if (!isValidIanaTimeZone(timeZone)) {
    return { ok: false, error: "Pick a time zone from the list." };
  }
  return { ok: true, values: { weightUnit, distanceUnit, timeZone } };
}

/** True when the profile still holds what a new account starts with, so the device's own values are a better guess. */
export function isUntouchedUnitsProfile(values: UnitsSettingsValues) {
  return values.weightUnit === "lbs" && values.distanceUnit === "mi" && UNTOUCHED_PROFILE_ZONES.has(values.timeZone);
}

/** The device's guess: its IANA zone, and units from the locale's region. Null fields mean "no opinion". */
export function guessDeviceUnits(device: { timeZone?: string | null; locale?: string | null }): Partial<UnitsSettingsValues> {
  const guess: Partial<UnitsSettingsValues> = {};
  if (isValidIanaTimeZone(device.timeZone)) {
    guess.timeZone = device.timeZone.trim();
  }
  const region = readLocaleRegion(device.locale);
  if (region) {
    if (POUND_AND_MILE_REGIONS.has(region)) {
      guess.weightUnit = "lbs";
      guess.distanceUnit = "mi";
    } else if (MILE_ONLY_REGIONS.has(region)) {
      guess.weightUnit = "kg";
      guess.distanceUnit = "mi";
    } else {
      guess.weightUnit = "kg";
      guess.distanceUnit = "km";
    }
  }
  return guess;
}

function readLocaleRegion(locale: string | null | undefined): string | null {
  if (!locale) return null;
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return region ? region.toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * What the panel starts with: the saved values, or (only while the profile is untouched) the device's guess on top.
 * `fromDevice` says the form differs from what is saved, so the panel can say where the values came from.
 */
export function resolveUnitsSettingsPreset(
  saved: UnitsSettingsValues,
  device: { timeZone?: string | null; locale?: string | null },
): { values: UnitsSettingsValues; fromDevice: boolean } {
  if (!isUntouchedUnitsProfile(saved)) {
    return { values: saved, fromDevice: false };
  }
  const values = { ...saved, ...guessDeviceUnits(device) };
  return { values, fromDevice: !sameUnitsSettings(values, saved) };
}

export function sameUnitsSettings(a: UnitsSettingsValues, b: UnitsSettingsValues) {
  return a.weightUnit === b.weightUnit && a.distanceUnit === b.distanceUnit && a.timeZone === b.timeZone;
}

/** Short labels people read: "lb", not "lbs". */
export function formatWeightUnitLabel(unit: WeightUnit) {
  return unit === "lbs" ? "lb" : "kg";
}

/** The Settings row's status chip: "lb · mi". */
export function formatUnitsSettingsStatus(values: Pick<UnitsSettingsValues, "weightUnit" | "distanceUnit">) {
  return `${formatWeightUnitLabel(values.weightUnit)} · ${values.distanceUnit}`;
}

/** "Eastern (New York)" for the presets, "Europe/London" style ids become "London (Europe)". */
export function formatTimeZoneLabel(timeZone: string) {
  const preset = getRoutineTimezoneLabel(timeZone);
  const parts = timeZone.split("/");
  const city = (parts[parts.length - 1] ?? timeZone).replace(/_/g, " ");
  if (preset !== timeZone) {
    return `${preset} (${city})`;
  }
  if (parts.length < 2) {
    return timeZone;
  }
  return `${city} (${parts.slice(0, -1).join(" / ").replace(/_/g, " ")})`;
}

/**
 * The picker's options: the presets first, then the saved and device zones if they are not presets, then every zone
 * the runtime knows (alphabetical). No duplicates.
 */
export function buildTimeZoneOptions(args: { current: string; device?: string | null; all?: readonly string[] }) {
  const common: string[] = [...ROUTINE_TIMEZONE_OPTIONS];
  for (const extra of [args.device, args.current]) {
    if (extra && isValidIanaTimeZone(extra) && !common.includes(extra)) {
      common.unshift(extra);
    }
  }
  const rest = (args.all ?? []).filter((zone) => !common.includes(zone));
  return {
    common: common.map((value) => ({ value, label: formatTimeZoneLabel(value) })),
    all: rest.map((value) => ({ value, label: formatTimeZoneLabel(value) })),
  };
}
