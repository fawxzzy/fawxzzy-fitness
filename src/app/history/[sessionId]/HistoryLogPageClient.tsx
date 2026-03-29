"use client";

import { LogAuditClient } from "./LogAuditClient";
import type { SessionSummary } from "../session-summary";

type AuditSet = {
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

type AuditExercise = {
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
  sets: AuditSet[];
};

type IncomingAuditSet = Partial<AuditSet> & {
  setId?: string;
  index?: number;
  durationSeconds?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  weightUnit?: "lbs" | "kg" | null;
};

type IncomingAuditExercise = Partial<AuditExercise> & {
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
  logged_sets?: IncomingAuditSet[];
};

function normalizeSet(set: IncomingAuditSet, index: number): AuditSet {
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

function normalizeExercise(exercise: IncomingAuditExercise, index: number): AuditExercise {
  const fallbackSets = Array.isArray(exercise.logged_sets) ? exercise.logged_sets : [];
  const rawSets = Array.isArray(exercise.sets) ? exercise.sets : fallbackSets;

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
    sets: rawSets.map((set, setIndex) => normalizeSet(set, setIndex)),
  };
}

function normalizeExercises(
  exercises: IncomingAuditExercise[] | undefined,
  sessionExercises: IncomingAuditExercise[] | undefined,
  logExercises: IncomingAuditExercise[] | undefined,
  workoutExercises: IncomingAuditExercise[] | undefined,
): AuditExercise[] {
  const rawExercises = exercises ?? sessionExercises ?? logExercises ?? workoutExercises ?? [];
  return rawExercises.map((exercise, index) => normalizeExercise(exercise, index));
}

export function HistoryLogPageClient(props: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises?: IncomingAuditExercise[];
  sessionExercises?: IncomingAuditExercise[];
  logExercises?: IncomingAuditExercise[];
  workoutExercises?: IncomingAuditExercise[];
  sessionSummary: SessionSummary;
  backHref: string;
}) {
  const normalizedExercises = normalizeExercises(props.exercises, props.sessionExercises, props.logExercises, props.workoutExercises);

  return <LogAuditClient {...props} exercises={normalizedExercises} />;
}
