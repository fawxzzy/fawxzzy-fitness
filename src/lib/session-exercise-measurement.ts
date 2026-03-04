import "server-only";

export type SessionExerciseMeasurementType = "reps" | "time" | "distance" | "time_distance";

export function resolveSessionExerciseMeasurementType(value: unknown): SessionExerciseMeasurementType {
  if (value === "time" || value === "distance" || value === "time_distance" || value === "reps") {
    return value;
  }
  return "reps";
}

export function defaultUnitForSessionExerciseMeasurementType(measurementType: SessionExerciseMeasurementType): SessionExerciseMeasurementType {
  return measurementType;
}

export function warnOnSessionExerciseUnitMismatch(input: {
  measurementType: SessionExerciseMeasurementType;
  defaultUnit: string | null | undefined;
  context: string;
}) {
  if (process.env.NODE_ENV !== "development") return;
  if (input.measurementType !== "reps" && input.defaultUnit === "reps") {
    console.warn("[session-exercises] invariant warning: non-reps measurement_type persisted with reps default_unit", {
      context: input.context,
      measurementType: input.measurementType,
      defaultUnit: input.defaultUnit,
    });
  }
}

