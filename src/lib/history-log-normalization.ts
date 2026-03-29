export type HistoryAuditSet = {
  id: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "mi" | "km" | "m" | null;
  calories: number | null;
  weight_unit: "lbs" | "kg" | null;
};

export type HistoryAuditExercise = {
  id: string;
  exercise_id: string;
  exercise_name?: string | null;
  exercise_slug?: string | null;
  exercise_image_path?: string | null;
  exercise_image_icon_path?: string | null;
  exercise_image_howto_path?: string | null;
  notes: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  sets: HistoryAuditSet[];
};

export type IncomingHistoryAuditSet = Partial<HistoryAuditSet> & {
  setId?: string;
  index?: number;
  durationSeconds?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  weightUnit?: "lbs" | "kg" | null;
};

export type IncomingHistoryAuditExercise = Partial<HistoryAuditExercise> & {
  name?: string | null;
  exerciseId?: string;
  exerciseName?: string | null;
  slug?: string | null;
  image?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  media?: {
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  } | null;
  logged_sets?: IncomingHistoryAuditSet[] | null;
  sets?: IncomingHistoryAuditSet[] | null;
};

type IncomingHistoryExerciseCollection = IncomingHistoryAuditExercise[] | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function pickPreferredArray<T>(candidates: Array<T[] | null | undefined>): T[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function normalizeHistoryAuditSet(set: IncomingHistoryAuditSet, index: number): HistoryAuditSet {
  return {
    id: set.id ?? set.setId ?? `set-${index}`,
    set_index: set.set_index ?? set.index ?? index,
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    duration_seconds: set.duration_seconds ?? set.durationSeconds ?? null,
    distance: set.distance ?? null,
    distance_unit: set.distance_unit ?? set.distanceUnit ?? null,
    calories: set.calories ?? null,
    weight_unit: set.weight_unit ?? set.weightUnit ?? null,
  };
}

export function normalizeHistoryAuditExercise(exercise: IncomingHistoryAuditExercise, index: number): HistoryAuditExercise {
  const rawSets = pickPreferredArray([
    exercise.sets,
    exercise.logged_sets,
  ]);

  return {
    id: exercise.id ?? exercise.exercise_id ?? exercise.exerciseId ?? `exercise-${index}`,
    exercise_id: exercise.exercise_id ?? exercise.exerciseId ?? exercise.id ?? `exercise-${index}`,
    exercise_name: exercise.exercise_name ?? exercise.exerciseName ?? exercise.name ?? null,
    exercise_slug: exercise.exercise_slug ?? exercise.slug ?? null,
    exercise_image_path: exercise.exercise_image_path ?? exercise.image_path ?? exercise.image ?? exercise.media?.image_path ?? null,
    exercise_image_icon_path: exercise.exercise_image_icon_path ?? exercise.image_icon_path ?? exercise.media?.image_icon_path ?? null,
    exercise_image_howto_path: exercise.exercise_image_howto_path ?? exercise.image_howto_path ?? exercise.media?.image_howto_path ?? null,
    notes: exercise.notes ?? null,
    measurement_type: exercise.measurement_type ?? "reps",
    default_unit: exercise.default_unit ?? null,
    sets: rawSets
      .filter((set): set is IncomingHistoryAuditSet => isRecord(set))
      .map((set, setIndex) => normalizeHistoryAuditSet(set, setIndex)),
  };
}

export function normalizeHistoryLogExercises(options: {
  exercises?: IncomingHistoryExerciseCollection;
  sessionExercises?: IncomingHistoryExerciseCollection;
  logExercises?: IncomingHistoryExerciseCollection;
  workoutExercises?: IncomingHistoryExerciseCollection;
}): HistoryAuditExercise[] {
  const rawExercises = pickPreferredArray([
    options.exercises,
    options.sessionExercises,
    options.logExercises,
    options.workoutExercises,
  ]);

  return rawExercises
    .filter((exercise): exercise is IncomingHistoryAuditExercise => isRecord(exercise))
    .map((exercise, index) => normalizeHistoryAuditExercise(exercise, index));
}
