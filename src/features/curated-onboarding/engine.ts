import type {
  CuratedOnboardingData,
  EquipmentAccess,
  TrainingGoal,
} from "./types.ts";

export type CuratedPlanExercise = {
  slug: string;
  name: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetDurationSeconds?: number;
  progressionPlaybookId: "double_progression";
};

export type CuratedPlanDay = {
  name: string;
  exercises: CuratedPlanExercise[];
};

export type CuratedWorkoutPlan = {
  version: 1;
  planId: string;
  name: string;
  rationale: string[];
  daysPerWeek: number;
  sessionLengthMinutes: number;
  progressionPlaybookId: "double_progression";
  days: CuratedPlanDay[];
};

export type CuratedHistorySignals = {
  completionRate: number | null;
  missedWorkoutCount: number;
  failedExerciseSlugs: string[];
  fatiguedExerciseSlugs: string[];
  availableEquipment?: EquipmentAccess[];
};

type MovementRole =
  | "squat"
  | "hinge"
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "lunge"
  | "core"
  | "cardio";

type ExerciseCandidate = {
  slug: string;
  name: string;
  equipment: EquipmentAccess[];
};

const CANDIDATES: Record<MovementRole, ExerciseCandidate[]> = {
  squat: [
    { slug: "back-squat", name: "Back Squat", equipment: ["full-gym", "barbell"] },
    { slug: "leg-press", name: "Leg Press", equipment: ["full-gym", "machines"] },
    { slug: "goblet-squat", name: "Goblet Squat", equipment: ["full-gym", "dumbbells"] },
    { slug: "bodyweight-walking-lunge", name: "Bodyweight Walking Lunge", equipment: ["bodyweight"] },
  ],
  hinge: [
    { slug: "romanian-deadlift", name: "Romanian Deadlift", equipment: ["full-gym", "barbell"] },
    { slug: "single-leg-romanian-deadlift", name: "Single-Leg Romanian Deadlift", equipment: ["full-gym", "dumbbells"] },
    { slug: "smith-machine-romanian-deadlift", name: "Smith Machine Romanian Deadlift", equipment: ["full-gym", "machines"] },
    { slug: "glute-bridge", name: "Glute Bridge", equipment: ["bodyweight", "bands"] },
  ],
  "horizontal-push": [
    { slug: "barbell-bench-press", name: "Barbell Bench Press", equipment: ["full-gym", "barbell"] },
    { slug: "dumbbell-bench-press", name: "Dumbbell Bench Press", equipment: ["full-gym", "dumbbells"] },
    { slug: "smith-machine-bench-press", name: "Smith Machine Bench Press", equipment: ["full-gym", "machines"] },
    { slug: "push-up", name: "Push-Up", equipment: ["bodyweight", "bands"] },
  ],
  "vertical-push": [
    { slug: "overhead-press", name: "Overhead Press", equipment: ["full-gym", "barbell"] },
    { slug: "seated-dumbbell-shoulder-press", name: "Seated Dumbbell Shoulder Press", equipment: ["full-gym", "dumbbells"] },
    { slug: "machine-shoulder-press", name: "Machine Shoulder Press", equipment: ["full-gym", "machines"] },
    { slug: "pike-push-up", name: "Pike Push-Up", equipment: ["bodyweight", "bands"] },
  ],
  "horizontal-pull": [
    { slug: "barbell-row", name: "Barbell Row", equipment: ["full-gym", "barbell"] },
    { slug: "single-arm-dumbbell-row", name: "Single-Arm Dumbbell Row", equipment: ["full-gym", "dumbbells"] },
    { slug: "seated-cable-row", name: "Seated Cable Row", equipment: ["full-gym", "machines"] },
    { slug: "inverted-row", name: "Inverted Row", equipment: ["bodyweight", "bands"] },
  ],
  "vertical-pull": [
    { slug: "lat-pulldown", name: "Lat Pulldown", equipment: ["full-gym", "machines"] },
    { slug: "pull-up", name: "Pull-Up", equipment: ["bodyweight", "full-gym"] },
    { slug: "single-arm-dumbbell-row", name: "Single-Arm Dumbbell Row", equipment: ["dumbbells"] },
    { slug: "inverted-row", name: "Inverted Row", equipment: ["bands"] },
  ],
  lunge: [
    { slug: "walking-lunge", name: "Walking Lunge", equipment: ["full-gym", "dumbbells"] },
    { slug: "reverse-lunge", name: "Reverse Lunge", equipment: ["full-gym", "barbell", "dumbbells"] },
    { slug: "single-leg-press", name: "Single-Leg Press", equipment: ["machines"] },
    { slug: "bodyweight-walking-lunge", name: "Bodyweight Walking Lunge", equipment: ["bodyweight", "bands"] },
  ],
  core: [
    { slug: "plank", name: "Plank", equipment: ["full-gym", "barbell", "dumbbells", "machines", "bands", "bodyweight"] },
  ],
  cardio: [
    { slug: "incline-walk", name: "Incline Walk", equipment: ["full-gym", "machines"] },
    { slug: "mountain-climber", name: "Mountain Climber", equipment: ["barbell", "dumbbells", "bands", "bodyweight"] },
  ],
};

const SPLITS: Record<number, Array<{ name: string; roles: MovementRole[] }>> = {
  2: [
    { name: "Full Body A", roles: ["squat", "horizontal-push", "vertical-pull", "hinge", "core"] },
    { name: "Full Body B", roles: ["lunge", "vertical-push", "horizontal-pull", "hinge", "cardio"] },
  ],
  3: [
    { name: "Full Body A", roles: ["squat", "horizontal-push", "vertical-pull", "core", "cardio"] },
    { name: "Full Body B", roles: ["hinge", "vertical-push", "horizontal-pull", "lunge", "core"] },
    { name: "Full Body C", roles: ["lunge", "horizontal-push", "vertical-pull", "hinge", "cardio"] },
  ],
  4: [
    { name: "Upper A", roles: ["horizontal-push", "vertical-pull", "vertical-push", "horizontal-pull", "core"] },
    { name: "Lower A", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
    { name: "Upper B", roles: ["vertical-push", "horizontal-pull", "horizontal-push", "vertical-pull", "core"] },
    { name: "Lower B", roles: ["hinge", "lunge", "squat", "core", "cardio"] },
  ],
  5: [
    { name: "Upper", roles: ["horizontal-push", "vertical-pull", "vertical-push", "horizontal-pull", "core"] },
    { name: "Lower", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
    { name: "Push", roles: ["horizontal-push", "vertical-push", "lunge", "core", "cardio"] },
    { name: "Pull", roles: ["hinge", "vertical-pull", "horizontal-pull", "core", "cardio"] },
    { name: "Legs", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
  ],
  6: [
    { name: "Push A", roles: ["horizontal-push", "vertical-push", "lunge", "core", "cardio"] },
    { name: "Pull A", roles: ["hinge", "vertical-pull", "horizontal-pull", "core", "cardio"] },
    { name: "Legs A", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
    { name: "Push B", roles: ["vertical-push", "horizontal-push", "lunge", "core", "cardio"] },
    { name: "Pull B", roles: ["horizontal-pull", "vertical-pull", "hinge", "core", "cardio"] },
    { name: "Legs B", roles: ["lunge", "squat", "hinge", "core", "cardio"] },
  ],
};

function chooseExercise(role: MovementRole, equipment: EquipmentAccess[], excludedSlugs = new Set<string>()) {
  const available = CANDIDATES[role].filter((candidate) => candidate.equipment.some((value) => equipment.includes(value)));
  const selected = available.find((candidate) => !excludedSlugs.has(candidate.slug)) ?? available[0];
  return selected ?? CANDIDATES[role][CANDIDATES[role].length - 1];
}

function getTargetRange(goal: TrainingGoal, role: MovementRole) {
  if (role === "core" || role === "cardio") return { min: 8, max: 12 };
  if (goal === "get-stronger") return { min: 4, max: 6 };
  if (goal === "build-muscle") return { min: 8, max: 12 };
  return { min: 6, max: 10 };
}

function hashPlan(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function validateIntake(data: CuratedOnboardingData) {
  return Boolean(
    data.trainingGoal
    && data.experience
    && data.daysPerWeek
    && SPLITS[data.daysPerWeek]
    && data.sessionLengthMinutes
    && data.equipment.length > 0,
  );
}

function generateCuratedWorkoutPlanWithSignals(
  data: CuratedOnboardingData,
  signals: CuratedHistorySignals | null,
): CuratedWorkoutPlan {
  if (!validateIntake(data)) {
    throw new Error("Complete goal, experience, equipment, schedule, and session length before generating a plan.");
  }

  const goal = data.trainingGoal as TrainingGoal;
  const requestedDaysPerWeek = data.daysPerWeek as number;
  const shouldReduceSchedule = Boolean(
    signals
    && requestedDaysPerWeek > 2
    && (signals.missedWorkoutCount >= 2 || (signals.completionRate !== null && signals.completionRate < 0.6)),
  );
  const daysPerWeek = shouldReduceSchedule ? requestedDaysPerWeek - 1 : requestedDaysPerWeek;
  const sessionLengthMinutes = data.sessionLengthMinutes as number;
  const equipment = signals?.availableEquipment?.length ? signals.availableEquipment : data.equipment;
  const excludedSlugs = new Set([
    ...(signals?.failedExerciseSlugs ?? []),
    ...(signals?.fatiguedExerciseSlugs ?? []),
  ]);
  const exerciseLimit = sessionLengthMinutes <= 30 ? 4 : sessionLengthMinutes <= 45 ? 5 : sessionLengthMinutes <= 60 ? 6 : 7;
  const baseSets = data.experience === "beginner" ? 3 : goal === "get-stronger" ? 4 : 3;
  const split = SPLITS[daysPerWeek];
  const days = split.map((day) => ({
    name: day.name,
    exercises: day.roles.slice(0, exerciseLimit).map((role, index) => {
      const exercise = chooseExercise(role, equipment, excludedSlugs);
      const range = getTargetRange(goal, role);
      return {
        ...exercise,
        targetSets: role === "cardio" ? 1 : role === "core" || index >= 3 ? Math.min(baseSets, 3) : baseSets,
        targetRepsMin: range.min,
        targetRepsMax: range.max,
        ...(role === "cardio" && exercise.slug === "incline-walk" ? { targetDurationSeconds: 600 } : {}),
        progressionPlaybookId: "double_progression" as const,
      };
    }),
  }));
  const nameByGoal: Record<TrainingGoal, string> = {
    "build-muscle": "Atlas Muscle",
    "get-leaner": "Atlas Lean",
    "get-stronger": "Atlas Strength",
    "general-fitness": "Atlas Fitness",
  };
  const stableInput = JSON.stringify({
    goal,
    experience: data.experience,
    daysPerWeek,
    sessionLengthMinutes,
    equipment: [...equipment].sort(),
    preferredStyle: data.preferredStyle ?? null,
    cardioPreference: data.cardioPreference ?? null,
    adaptiveSignals: signals ? {
      completionRate: signals.completionRate,
      missedWorkoutCount: signals.missedWorkoutCount,
      failedExerciseSlugs: [...signals.failedExerciseSlugs].sort(),
      fatiguedExerciseSlugs: [...signals.fatiguedExerciseSlugs].sort(),
    } : null,
  });

  const adaptiveRationale = [
    ...(shouldReduceSchedule
      ? [`Recent completion supports ${daysPerWeek} days instead of the requested ${requestedDaysPerWeek}; the draft stays editable.`]
      : []),
    ...(excludedSlugs.size > 0
      ? [`Recent failed-target or fatigue signals replaced ${excludedSlugs.size} exercise choice${excludedSlugs.size === 1 ? "" : "s"} where an equipment-compatible alternative existed.`]
      : []),
  ];

  return {
    version: 1,
    planId: `curated-${hashPlan(stableInput)}`,
    name: nameByGoal[goal],
    rationale: [
      `${daysPerWeek} training days sized for ${sessionLengthMinutes}-minute sessions.`,
      `Exercise choices are limited to ${equipment.join(", ")}.`,
      `${data.experience} ${goal.replace(/-/g, " ")} targets use double progression.`,
      ...adaptiveRationale,
    ],
    daysPerWeek,
    sessionLengthMinutes,
    progressionPlaybookId: "double_progression",
    days,
  };
}

export function generateCuratedWorkoutPlan(data: CuratedOnboardingData): CuratedWorkoutPlan {
  return generateCuratedWorkoutPlanWithSignals(data, null);
}

export function generateAdaptiveCuratedWorkoutPlan(
  data: CuratedOnboardingData,
  signals: CuratedHistorySignals,
): CuratedWorkoutPlan {
  return generateCuratedWorkoutPlanWithSignals(data, signals);
}
