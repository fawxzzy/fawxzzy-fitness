export type EnabledMeasurements = {
  reps: boolean;
  weight: boolean;
  time: boolean;
  distance: boolean;
  calories: boolean;
};

export type MeasurementValueInput = {
  reps?: string | number | null;
  weight?: string | number | null;
  duration?: string | null;
  durationSeconds?: number | null;
  distance?: string | number | null;
  calories?: string | number | null;
};

type SanitizableMeasurementValues = MeasurementValueInput;

function emptyDisabledValue<T>(value: T): T {
  if (typeof value === "string") return "" as T;
  return null as T;
}

function hasInputValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return value !== null && value !== undefined;
}

export function deriveMeasurementPresenceFromValues(values: MeasurementValueInput): EnabledMeasurements {
  return {
    reps: hasInputValue(values.reps),
    weight: hasInputValue(values.weight),
    time: hasInputValue(values.duration) || hasInputValue(values.durationSeconds),
    distance: hasInputValue(values.distance),
    calories: hasInputValue(values.calories),
  };
}

export function sanitizeEnabledMeasurementValues<T extends SanitizableMeasurementValues>(
  enabled: EnabledMeasurements,
  raw: T,
): T {
  return {
    ...raw,
    ...(Object.prototype.hasOwnProperty.call(raw, "reps") ? { reps: enabled.reps ? raw.reps : emptyDisabledValue(raw.reps) } : null),
    ...(Object.prototype.hasOwnProperty.call(raw, "weight") ? { weight: enabled.weight ? raw.weight : emptyDisabledValue(raw.weight) } : null),
    ...(Object.prototype.hasOwnProperty.call(raw, "duration") ? { duration: enabled.time ? raw.duration : emptyDisabledValue(raw.duration) } : null),
    ...(Object.prototype.hasOwnProperty.call(raw, "durationSeconds") ? { durationSeconds: enabled.time ? raw.durationSeconds : emptyDisabledValue(raw.durationSeconds) } : null),
    ...(Object.prototype.hasOwnProperty.call(raw, "distance") ? { distance: enabled.distance ? raw.distance : emptyDisabledValue(raw.distance) } : null),
    ...(Object.prototype.hasOwnProperty.call(raw, "calories") ? { calories: enabled.calories ? raw.calories : emptyDisabledValue(raw.calories) } : null),
  } as T;
}
