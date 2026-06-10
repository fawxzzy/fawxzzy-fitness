import type { SessionSummary } from "@/app/history/session-summary";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";

export type WorkoutRecapSetInput = {
  weight: number | null;
  reps: number | null;
  weightUnit?: "lbs" | "kg" | "lb" | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: FitnessDistanceUnit | null;
  calories?: number | null;
};

export type WorkoutRecapExerciseInput = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutRecapSetInput[];
};

export type WorkoutRecapArtifact = {
  id: string;
  sessionId: string;
  title: string;
  completedAt: string;
  metrics: Array<{ label: string; value: string }>;
  topEfforts: Array<{ exerciseName: string; value: string }>;
  prMoments: string[];
  shareText: string;
};

type WorkoutRecapClient = {
  from: (table: string) => any;
};

function formatDuration(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) <= 0) {
    return null;
  }

  const totalSeconds = Math.round(value ?? 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatWeight(value: number | null | undefined, unit: string | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) <= 0) {
    return null;
  }

  return `${formatNumber(value ?? 0)} ${unit === "kg" ? "kg" : "lbs"}`;
}

function formatDistance(value: number | null | undefined, unit: string | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) <= 0) {
    return null;
  }

  return `${formatNumber(value ?? 0)} ${unit === "steps" ? "steps" : unit === "km" ? "km" : unit === "m" ? "m" : "mi"}`;
}

function formatSetEffort(set: WorkoutRecapSetInput) {
  const weight = formatWeight(set.weight, set.weightUnit);
  const reps = Number.isFinite(set.reps ?? Number.NaN) && (set.reps ?? 0) > 0
    ? `${formatNumber(set.reps ?? 0)} reps`
    : null;
  const duration = formatDuration(set.durationSeconds);
  const distance = formatDistance(set.distance, set.distanceUnit);
  const calories = Number.isFinite(set.calories ?? Number.NaN) && (set.calories ?? 0) > 0
    ? `${Math.round(set.calories ?? 0)} cal`
    : null;

  if (weight && reps) {
    return `${weight} x ${reps.replace(" reps", "")}`;
  }

  return [reps, duration, distance, calories].filter(Boolean).join(" | ") || null;
}

function scoreSet(set: WorkoutRecapSetInput) {
  const weight = Number.isFinite(set.weight ?? Number.NaN) ? Math.max(0, set.weight ?? 0) : 0;
  const reps = Number.isFinite(set.reps ?? Number.NaN) ? Math.max(0, set.reps ?? 0) : 0;
  const duration = Number.isFinite(set.durationSeconds ?? Number.NaN) ? Math.max(0, set.durationSeconds ?? 0) : 0;
  const distance = Number.isFinite(set.distance ?? Number.NaN) ? Math.max(0, set.distance ?? 0) : 0;
  const calories = Number.isFinite(set.calories ?? Number.NaN) ? Math.max(0, set.calories ?? 0) : 0;

  return (weight * Math.max(reps, 1) * 1000) + (reps * 100) + (distance * 100) + duration + calories;
}

function buildTopEfforts(exercises: WorkoutRecapExerciseInput[]) {
  return exercises
    .map((exercise) => {
      const bestSet = exercise.sets.reduce<WorkoutRecapSetInput | null>((best, current) => {
        if (!best) return current;
        return scoreSet(current) > scoreSet(best) ? current : best;
      }, null);
      const value = bestSet ? formatSetEffort(bestSet) : null;
      return value ? { exerciseName: exercise.exerciseName, value, score: scoreSet(bestSet as WorkoutRecapSetInput) } : null;
    })
    .filter((entry): entry is { exerciseName: string; value: string; score: number } => entry !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ exerciseName, value }) => ({ exerciseName, value }));
}

function buildShareText(args: {
  title: string;
  metrics: Array<{ label: string; value: string }>;
  topEfforts: Array<{ exerciseName: string; value: string }>;
  prMoments: string[];
}) {
  const metricLine = args.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(" | ");
  const effortLines = args.topEfforts.map((effort) => `- ${effort.exerciseName}: ${effort.value}`);
  const prLine = args.prMoments.length > 0 ? `PRs: ${args.prMoments.join(", ")}` : null;

  return [
    args.title,
    metricLine,
    prLine,
    effortLines.length > 0 ? "Top efforts:" : null,
    ...effortLines,
  ].filter(Boolean).join("\n");
}

export function buildWorkoutRecapArtifact(args: {
  sessionSummary: SessionSummary;
  exercises: WorkoutRecapExerciseInput[];
}): WorkoutRecapArtifact {
  const summary = args.sessionSummary;
  const duration = formatDuration(summary.durationSec);
  const metrics = [
    { label: "Exercises", value: String(Math.max(0, summary.exerciseCount)) },
    { label: "Sets", value: String(Math.max(0, summary.setCount)) },
    duration ? { label: "Duration", value: duration } : null,
    summary.totalVolume > 0
      ? { label: "Volume", value: `${Math.round(summary.totalVolume).toLocaleString()} ${summary.volumeUnit === "kg" ? "kg" : "lbs"}` }
      : null,
  ].filter((metric): metric is { label: string; value: string } => metric !== null);
  const topEfforts = buildTopEfforts(args.exercises);
  const prMoments = summary.prExerciseNames ?? [];
  const day = summary.dayTitle ? ` | ${summary.dayTitle}` : "";
  const title = `${summary.routineTitle}${day} recap`;

  return {
    id: `recap:${summary.id}`,
    sessionId: summary.id,
    title,
    completedAt: summary.startedAt,
    metrics,
    topEfforts,
    prMoments,
    shareText: buildShareText({ title, metrics, topEfforts, prMoments }),
  };
}

export async function buildWorkoutRecapArtifactForSession(args: {
  client: WorkoutRecapClient;
  sessionId: string;
  userId: string;
}) {
  const { data: session, error: sessionError } = await args.client
    .from("sessions")
    .select("id, performed_at, routine_id, routine_day_name, day_name_override, duration_seconds, name, routines(name)")
    .eq("id", args.sessionId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error("Session not found for recap generation.");
  }

  const { data: sessionExercises, error: sessionExercisesError } = await args.client
    .from("session_exercises")
    .select("id, exercise_id")
    .eq("session_id", args.sessionId)
    .eq("user_id", args.userId);

  if (sessionExercisesError) {
    throw sessionExercisesError;
  }

  const sessionExerciseRows = (sessionExercises ?? []) as Array<{ id: string; exercise_id: string | null }>;
  const sessionExerciseIds = sessionExerciseRows.map((row) => row.id);
  const exerciseIds = Array.from(new Set(sessionExerciseRows.map((row) => row.exercise_id).filter(Boolean) as string[]));
  const { data: sets, error: setsError } = sessionExerciseIds.length > 0
    ? await args.client
      .from("sets")
      .select("session_exercise_id, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories")
      .eq("user_id", args.userId)
      .in("session_exercise_id", sessionExerciseIds)
    : { data: [], error: null };

  if (setsError) {
    throw setsError;
  }

  const { data: exercises, error: exercisesError } = exerciseIds.length > 0
    ? await args.client
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds)
    : { data: [], error: null };

  if (exercisesError) {
    throw exercisesError;
  }

  const exerciseNameById = new Map(((exercises ?? []) as Array<{ id: string; name: string | null }>).map((row) => [row.id, row.name ?? "Exercise"]));
  const setsBySessionExerciseId = new Map<string, WorkoutRecapSetInput[]>();
  for (const set of (sets ?? []) as Array<WorkoutRecapSetInput & { session_exercise_id: string }>) {
    const current = setsBySessionExerciseId.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsBySessionExerciseId.set(set.session_exercise_id, current);
  }

  const routineField = (session as { routines?: { name?: string | null } | Array<{ name?: string | null }> | null }).routines;
  const routineName = Array.isArray(routineField)
    ? routineField[0]?.name
    : routineField?.name;
  const recapExercises = sessionExerciseRows.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id ?? row.id,
    exerciseName: row.exercise_id ? exerciseNameById.get(row.exercise_id) ?? "Exercise" : "Exercise",
    sets: setsBySessionExerciseId.get(row.id) ?? [],
  }));
  const setCount = recapExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const totalVolume = recapExercises.reduce((sum, exercise) => sum + exercise.sets.reduce((setSum, set) => {
    const weight = Number.isFinite(set.weight ?? Number.NaN) ? Math.max(0, set.weight ?? 0) : 0;
    const reps = Number.isFinite(set.reps ?? Number.NaN) ? Math.max(0, set.reps ?? 0) : 0;
    return setSum + (weight * reps);
  }, 0), 0);

  return buildWorkoutRecapArtifact({
    sessionSummary: {
      id: session.id,
      startedAt: session.performed_at,
      routineId: session.routine_id,
      routineTitle: routineName ?? session.name ?? "Session",
      dayTitle: session.day_name_override ?? session.routine_day_name ?? undefined,
      exerciseNames: recapExercises.map((exercise) => exercise.exerciseName),
      prExerciseNames: [],
      durationSec: session.duration_seconds ?? undefined,
      exerciseCount: recapExercises.length,
      setCount,
      repCount: recapExercises.reduce((sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + Math.max(0, set.reps ?? 0), 0), 0),
      prCounts: { total: 0, weight: 0, reps: 0 },
      prLabel: "No PRs",
      topSet: undefined,
      bestLift: undefined,
      totalVolume,
      volumeUnit: recapExercises.flatMap((exercise) => exercise.sets).find((set) => set.weightUnit === "kg") ? "kg" : "lbs",
      completionRate: setCount > 0 ? 1 : undefined,
      hasNote: false,
      hasSetData: setCount > 0,
    },
    exercises: recapExercises,
  });
}
