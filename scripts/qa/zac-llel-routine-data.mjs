import { randomUUID } from "node:crypto";

export const ZAC_LLEL_PREFIX = "[ZAC-LLEL]";
export const ZAC_LLEL_ROUTINE_NAME = `${ZAC_LLEL_PREFIX} Atlas Progression Lab`;
export const ZAC_LLEL_TIMEZONE = "America/New_York";

export function getZacLlelStartDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAC_LLEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function repsSet({ reps, weight = 0, weightUnit = "lbs" }) {
  return { reps, weight, weightUnit, durationSeconds: null, distance: null, distanceUnit: null, calories: null };
}

function timeSet({ durationSeconds, calories = null }) {
  return { reps: 0, weight: 0, weightUnit: null, durationSeconds, distance: null, distanceUnit: null, calories };
}

function distanceSet({ distance, distanceUnit = "mi", durationSeconds = null, calories = null }) {
  return { reps: 0, weight: 0, weightUnit: null, durationSeconds, distance, distanceUnit, calories };
}

function exercise(base) {
  return {
    primaryMuscle: base.primaryMuscle ?? "LLEL",
    equipment: base.equipment ?? null,
    measurementType: base.measurementType ?? "reps",
    defaultUnit: base.defaultUnit ?? (base.measurementType === "time" ? "seconds" : base.measurementType === "distance" ? "mi" : "reps"),
    targetSets: base.targetSets ?? null,
    repsMin: base.repsMin ?? null,
    repsMax: base.repsMax ?? base.repsMin ?? null,
    targetWeight: base.targetWeight ?? null,
    targetWeightUnit: base.targetWeightUnit ?? (typeof base.targetWeight === "number" ? "lbs" : null),
    targetDurationSeconds: base.targetDurationSeconds ?? null,
    targetDistance: base.targetDistance ?? null,
    targetDistanceUnit: base.targetDistanceUnit ?? null,
    targetCalories: base.targetCalories ?? null,
    playbookId: base.playbookId ?? "double_progression",
    playbookConfig: base.playbookConfig ?? { version: 1, loadIncrement: 5 },
    sessions: base.sessions ?? [],
    ...base,
  };
}

function session({ performedAt, sets, status = "completed" }) {
  return { performedAt, status, sets };
}

export function getZacLlelRoutineDefinition() {
  return {
    id: "zac_llel_atlas_progression_lab",
    title: "Zac LLEL Atlas Progression Lab",
    expected: "Human-account LLEL routine with ready updates, status rows, linked updates, deload, cardio, recap, and hidden stretch rows.",
    expectations: {
      readyUpdateCount: 7,
      statusCount: 15,
      linkedGroupCount: 1,
      completedSessionCount: 20,
      setCount: 44,
    },
    contextRoutines: [
      {
        name: `${ZAC_LLEL_PREFIX} History Context`,
        days: [
          {
            name: "Context",
            isRest: false,
            exercises: [
              exercise({
                key: "leg-press-context",
                sharedExerciseKey: "leg-press",
                name: "Leg Press",
                primaryMuscle: "Legs",
                equipment: "Machine",
                targetSets: 3,
                repsMin: 8,
                repsMax: 10,
                targetWeight: 270,
                sessions: [session({ performedAt: "2026-04-03T10:00:00.000Z", sets: [4, 4].map((reps) => repsSet({ reps, weight: 380 })) })],
              }),
              exercise({
                key: "step-up-context",
                sharedExerciseKey: "step-up",
                name: "Step-Up",
                primaryMuscle: "Legs",
                equipment: "Dumbbell",
                targetSets: 3,
                repsMin: 10,
                repsMax: 10,
                targetWeight: 25,
                sessions: [session({ performedAt: "2026-04-03T10:00:00.000Z", sets: [10, 10].map((reps) => repsSet({ reps, weight: 0 })) })],
              }),
              exercise({
                key: "curl-context",
                sharedExerciseKey: "dumbbell-curl",
                name: "Dumbbell Curl",
                primaryMuscle: "Arms",
                equipment: "Dumbbell",
                targetSets: 3,
                repsMin: 8,
                repsMax: 10,
                targetWeight: 35,
                sessions: [session({ performedAt: "2026-04-21T10:00:00.000Z", sets: [6, 6, 6].map((reps) => repsSet({ reps, weight: 35 })) })],
              }),
            ],
          },
        ],
      },
    ],
    days: [
      {
        name: "Hunt",
        isRest: false,
        exercises: [
          exercise({
            key: "hunt-stretch",
            name: "Stretch",
            primaryMuscle: "Mobility",
            equipment: "Bodyweight",
            measurementType: "none",
            defaultUnit: null,
            targetSets: null,
            playbookId: null,
            playbookConfig: null,
            sessions: [session({ performedAt: "2026-05-04T10:00:00.000Z", sets: [repsSet({ reps: 0, weight: 0 })] })],
          }),
          exercise({
            key: "hunt-treadmill",
            sharedExerciseKey: "treadmill-run",
            name: "Treadmill Run",
            primaryMuscle: "Cardio",
            equipment: "Cardio Machine",
            measurementType: "time",
            defaultUnit: "seconds",
            targetSets: 1,
            targetDurationSeconds: 180,
            sessions: [session({ performedAt: "2026-05-04T10:00:00.000Z", sets: [timeSet({ durationSeconds: 540 })] })],
          }),
          exercise({
            key: "hunt-weighted-pull-up",
            name: "Weighted Pull-Up",
            primaryMuscle: "Back",
            equipment: "Weighted Bodyweight",
            targetSets: 3,
            repsMin: 5,
            repsMax: 8,
            targetWeight: 25,
            sessions: [session({ performedAt: "2026-05-04T10:00:00.000Z", sets: [8, 8, 8].map((reps) => repsSet({ reps, weight: 30 })) })],
          }),
          exercise({
            key: "hunt-bench",
            name: "Barbell Bench Press",
            primaryMuscle: "Chest",
            equipment: "Barbell",
            targetSets: 3,
            repsMin: 4,
            repsMax: 6,
            targetWeight: 225,
            sessions: [session({ performedAt: "2026-05-04T10:00:00.000Z", sets: [8, 7, 4].map((reps) => repsSet({ reps, weight: 225 })) })],
          }),
          exercise({
            key: "hunt-row",
            name: "Chest-Supported Row",
            primaryMuscle: "Back",
            equipment: "Machine",
            targetSets: 3,
            repsMin: 6,
            repsMax: 6,
            targetWeight: 190,
            sessions: [session({ performedAt: "2026-05-04T10:00:00.000Z", sets: [10, 10, 10].map((reps) => repsSet({ reps, weight: 185 })) })],
          }),
          exercise({
            key: "hunt-lateral-raise",
            name: "Lateral Raise",
            primaryMuscle: "Shoulders",
            equipment: "Dumbbell",
            targetSets: 3,
            repsMin: 8,
            repsMax: 10,
            targetWeight: 25,
            sessions: [session({ performedAt: "2026-05-04T10:00:00.000Z", sets: [8, 20, 20].map((reps) => repsSet({ reps, weight: 30 })) })],
          }),
        ],
      },
      {
        name: "Forge",
        isRest: false,
        exercises: [
          exercise({
            key: "forge-squat",
            name: "Smith Machine Squat",
            primaryMuscle: "Legs",
            equipment: "Smith Machine",
            targetSets: 3,
            repsMin: 5,
            repsMax: 5,
            targetWeight: 230,
            sessions: [session({ performedAt: "2026-05-05T10:00:00.000Z", sets: [10, 10, 8, 8].map((reps) => repsSet({ reps, weight: 225 })) })],
          }),
          exercise({
            key: "forge-rdl",
            name: "Romanian Deadlift",
            primaryMuscle: "Hamstrings",
            equipment: "Barbell",
            targetSets: 3,
            repsMin: 6,
            repsMax: 8,
            targetWeight: 185,
          }),
          exercise({
            key: "forge-leg-press",
            sharedExerciseKey: "leg-press",
            name: "Leg Press",
            primaryMuscle: "Legs",
            equipment: "Machine",
            targetSets: 3,
            repsMin: 8,
            repsMax: 10,
            targetWeight: 270,
          }),
          exercise({
            key: "forge-step-up",
            sharedExerciseKey: "step-up",
            name: "Step-Up",
            primaryMuscle: "Legs",
            equipment: "Dumbbell",
            targetSets: 3,
            repsMin: 10,
            repsMax: 10,
            targetWeight: 25,
          }),
          exercise({
            key: "forge-seated-curl",
            name: "Seated Leg Curl",
            primaryMuscle: "Hamstrings",
            equipment: "Machine",
            targetSets: 3,
            repsMin: 8,
            repsMax: 10,
            targetWeight: 110,
            sessions: [session({ performedAt: "2026-05-05T10:00:00.000Z", sets: [8, 12, 15].map((reps) => repsSet({ reps, weight: 240 })) })],
          }),
          exercise({
            key: "forge-ab-wheel",
            name: "Ab Wheel Rollout",
            primaryMuscle: "Core",
            equipment: "Bodyweight",
            targetSets: 3,
            repsMin: 8,
            repsMax: 10,
            targetWeight: null,
          }),
        ],
      },
      { name: "Rest", isRest: true, exercises: [] },
      {
        name: "Shade",
        isRest: false,
        exercises: [
          exercise({
            key: "shade-treadmill",
            sharedExerciseKey: "treadmill-run",
            name: "Treadmill Run",
            primaryMuscle: "Cardio",
            equipment: "Cardio Machine",
            measurementType: "time",
            defaultUnit: "seconds",
            targetSets: 1,
            targetDurationSeconds: 180,
            sessions: [session({ performedAt: "2026-04-30T10:00:00.000Z", sets: [timeSet({ durationSeconds: 180 })] })],
          }),
          exercise({
            key: "shade-treadmill-different",
            sharedExerciseKey: "treadmill-run",
            name: "Treadmill Run",
            primaryMuscle: "Cardio",
            equipment: "Cardio Machine",
            measurementType: "time",
            defaultUnit: "seconds",
            targetSets: 1,
            targetDurationSeconds: 240,
            sessions: [session({ performedAt: "2026-04-30T10:00:00.000Z", sets: [timeSet({ durationSeconds: 240 })] })],
          }),
          exercise({
            key: "shade-shoulder-press",
            name: "Machine Shoulder Press",
            primaryMuscle: "Shoulders",
            equipment: "Machine",
            targetSets: 3,
            repsMin: 6,
            repsMax: 10,
            targetWeight: 100,
            sessions: [session({ performedAt: "2026-04-30T10:00:00.000Z", sets: [10, 10, 6].map((reps) => repsSet({ reps, weight: 100 })) })],
          }),
          exercise({
            key: "shade-curl",
            sharedExerciseKey: "dumbbell-curl",
            name: "Dumbbell Curl",
            primaryMuscle: "Arms",
            equipment: "Dumbbell",
            targetSets: 3,
            repsMin: 8,
            repsMax: 10,
            targetWeight: 35,
          }),
        ],
      },
      { name: "Rest", isRest: true, exercises: [] },
      {
        name: "Feral",
        isRest: false,
        exercises: [
          exercise({
            key: "feral-distance-run",
            name: "Treadmill Run",
            primaryMuscle: "Cardio",
            equipment: "Cardio Machine",
            measurementType: "distance",
            defaultUnit: "mi",
            targetSets: 1,
            targetDistance: 2,
            targetDistanceUnit: "mi",
            sessions: [session({ performedAt: "2026-05-09T10:00:00.000Z", sets: [distanceSet({ distance: 2 })] })],
          }),
          exercise({
            key: "feral-incline-walk",
            name: "Incline Walk",
            primaryMuscle: "Cardio",
            equipment: "Cardio Machine",
            measurementType: "time_distance",
            defaultUnit: "mi",
            targetSets: 1,
            targetDurationSeconds: 900,
            targetDistance: 0.75,
            targetDistanceUnit: "mi",
            sessions: [session({ performedAt: "2026-05-09T10:00:00.000Z", sets: [distanceSet({ distance: 0.75, durationSeconds: 900, calories: 120 })] })],
          }),
          exercise({
            key: "feral-overhead-triceps-deload",
            name: "Overhead Triceps Extension",
            primaryMuscle: "Arms",
            equipment: "Cable",
            targetSets: 3,
            repsMin: 6,
            repsMax: 8,
            targetWeight: 70,
            playbookConfig: { version: 1, loadIncrement: 5, regressionPolicy: "deload_after_stall", stallSessionCount: 2, deloadPercent: 10 },
            sessions: [
              session({ performedAt: "2026-04-25T10:00:00.000Z", sets: [5, 5, 4].map((reps) => repsSet({ reps, weight: 70 })) }),
              session({ performedAt: "2026-05-02T10:00:00.000Z", sets: [5, 4, 4].map((reps) => repsSet({ reps, weight: 70 })) }),
            ],
          }),
          exercise({
            key: "feral-dips",
            name: "Dips (Triceps)",
            primaryMuscle: "Arms",
            equipment: "Bodyweight",
            targetSets: 3,
            repsMin: 10,
            repsMax: 15,
            targetWeight: null,
            sessions: [session({ performedAt: "2026-05-09T10:00:00.000Z", sets: [15, 15].map((reps) => repsSet({ reps, weight: 0 })) })],
          }),
        ],
      },
      {
        name: "Ghost",
        isRest: false,
        exercises: [
          exercise({
            key: "ghost-treadmill",
            sharedExerciseKey: "treadmill-run",
            name: "Treadmill Run",
            primaryMuscle: "Cardio",
            equipment: "Cardio Machine",
            measurementType: "time",
            defaultUnit: "seconds",
            targetSets: 1,
            targetDurationSeconds: 180,
            sessions: [session({ performedAt: "2026-05-10T10:00:00.000Z", sets: [timeSet({ durationSeconds: 180 })] })],
          }),
          exercise({
            key: "ghost-calf",
            name: "Calf Raise (Standing)",
            primaryMuscle: "Calves",
            equipment: "Machine",
            targetSets: 4,
            repsMin: 12,
            repsMax: 20,
            targetWeight: 135,
          }),
          exercise({
            key: "ghost-cable-crunch",
            name: "Cable Crunch",
            primaryMuscle: "Core",
            equipment: "Cable",
            targetSets: 3,
            repsMin: 10,
            repsMax: 15,
            targetWeight: 80,
          }),
          exercise({
            key: "ghost-mobility",
            name: "Stretch",
            primaryMuscle: "Mobility",
            equipment: "Bodyweight",
            measurementType: "time",
            defaultUnit: "seconds",
            targetSets: 1,
            targetDurationSeconds: 600,
            playbookId: null,
            playbookConfig: null,
          }),
        ],
      },
    ],
  };
}

export function mapLlelMeasurementType(value) {
  return value === "time" || value === "distance" || value === "time_distance" || value === "none" ? value : "reps";
}

export function buildZacLlelRoutineName() {
  return ZAC_LLEL_ROUTINE_NAME;
}

export function buildZacLlelExerciseName(exercise) {
  return `${ZAC_LLEL_PREFIX} ${exercise.name}`;
}

export function collectZacLlelExerciseDefinitions(definition = getZacLlelRoutineDefinition()) {
  return [
    ...(definition.days ?? []).flatMap((day) => day.exercises ?? []),
    ...(definition.contextRoutines ?? []).flatMap((routine) => routine.days.flatMap((day) => day.exercises ?? [])),
  ];
}

export function buildZacLlelSessionName(dayName, exerciseName) {
  return `${ZAC_LLEL_PREFIX} ${dayName} - ${exerciseName}`;
}

export function createLlelId() {
  return randomUUID();
}

export function summarizeZacLlelDefinition(definition = getZacLlelRoutineDefinition()) {
  const allDays = [
    ...(definition.contextRoutines ?? []).flatMap((routine) => routine.days ?? []),
    ...(definition.days ?? []),
  ];
  const exercises = allDays.flatMap((day) => day.exercises ?? []);
  const sessions = exercises.flatMap((item) => item.sessions ?? []);
  const setCount = sessions.reduce((total, item) => total + (item.sets?.length ?? 0), 0);

  return {
    id: definition.id,
    title: definition.title,
    routineName: ZAC_LLEL_ROUTINE_NAME,
    dayCount: definition.days.length,
    trainingDayCount: definition.days.filter((day) => !day.isRest).length,
    restDayCount: definition.days.filter((day) => day.isRest).length,
    exerciseCount: definition.days.reduce((total, day) => total + (day.exercises?.length ?? 0), 0),
    contextRoutineCount: definition.contextRoutines?.length ?? 0,
    completedSessionCount: sessions.length,
    setCount,
    expectations: definition.expectations,
    scenarioCoverage: [
      "ready_update",
      "progress_status",
      "linked_update",
      "selected_apply_revert",
      "no_history",
      "history_outside_planned_row",
      "above_target_not_ready",
      "below_target_load",
      "incomplete_checked_sets",
      "cardio_duration",
      "cardio_distance",
      "time_distance",
      "deload",
      "stretch_hidden",
      "recap_artifact",
    ],
  };
}
