import "server-only";

export type SessionExerciseMeasurementType = "reps" | "time" | "distance" | "time_distance" | "none";
export type SessionExerciseDefaultUnit = "reps" | "time" | "distance" | "time_distance" | null;

export function resolveSessionExerciseMeasurementType(value: unknown): SessionExerciseMeasurementType {
  if (value === "time" || value === "distance" || value === "time_distance" || value === "reps" || value === "none") {
    return value;
  }
  return "reps";
}

export function defaultUnitForSessionExerciseMeasurementType(measurementType: SessionExerciseMeasurementType): SessionExerciseDefaultUnit {
  if (measurementType === "none") {
    return null;
  }

  return measurementType;
}

export function warnOnSessionExerciseUnitMismatch(input: {
  measurementType: SessionExerciseMeasurementType;
  defaultUnit: string | null | undefined;
  context: string;
}) {
  if (process.env.NODE_ENV !== "development") return;
  if (input.measurementType !== "reps" && input.measurementType !== "none" && input.defaultUnit === "reps") {
    console.warn("[session-exercises] invariant warning: non-reps measurement_type persisted with reps default_unit", {
      context: input.context,
      measurementType: input.measurementType,
      defaultUnit: input.defaultUnit,
    });
  }

  if (input.measurementType === "none" && input.defaultUnit !== null && input.defaultUnit !== undefined) {
    console.warn("[session-exercises] invariant warning: measurement-optional session exercise persisted with default_unit", {
      context: input.context,
      measurementType: input.measurementType,
      defaultUnit: input.defaultUnit,
    });
  }
}

