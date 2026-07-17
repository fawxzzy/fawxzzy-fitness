import type {
  CuratedOnboardingData,
  EquipmentAccess,
  TrainingGoal,
} from "./types.ts";

export type CuratedPlanExercise = {
  slug: string;
  name: string;
  measurementType: "reps" | "time";
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
  measurementType?: "reps" | "time";
  targetDurationSeconds?: number;
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
    { slug: "plank", name: "Plank", equipment: ["full-gym", "barbell", "dumbbells", "machines", "bands", "bodyweight"], measurementType: "time", targetDurationSeconds: 60 },
  ],
  cardio: [
    { slug: "incline-walk", name: "Incline Walk", equipment: ["full-gym", "machines"], measurementType: "time", targetDurationSeconds: 600 },
    { slug: "mountain-climber", name: "Mountain Climber", equipment: ["barbell", "dumbbells", "bands", "bodyweight"], measurementType: "time", targetDurationSeconds: 60 },
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

function normalizeConstraint(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

const MOVEMENT_CONSTRAINT_TOKENS = new Set([
  "squat",
  "deadlift",
  "press",
  "row",
  "lunge",
  "pull",
  "push",
  "plank",
  "walk",
  "climber",
  "bridge",
]);

function constraintTokens(value: string) {
  return normalizeConstraint(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token);
}

function buildIntakeConstraintExclusions(data: CuratedOnboardingData) {
  const dislikes = new Set(data.exerciseDislikes.map(normalizeConstraint).filter(Boolean));
  const limitationText = normalizeConstraint(data.limitations ?? "");
  const limitationTokens = new Set(constraintTokens(data.limitations ?? ""));
  const excluded = new Set<string>();

  for (const candidates of Object.values(CANDIDATES)) {
    for (const candidate of candidates) {
      const normalizedSlug = normalizeConstraint(candidate.slug);
      const normalizedName = normalizeConstraint(candidate.name);
      const candidateMovementTokens = constraintTokens(candidate.name).filter((token) => MOVEMENT_CONSTRAINT_TOKENS.has(token));
      const explicitlyDisliked = dislikes.has(normalizedSlug) || dislikes.has(normalizedName);
      const namedInLimitations = Boolean(
        limitationText
        && (limitationText.includes(normalizedSlug)
          || limitationText.includes(normalizedName)
          || candidateMovementTokens.some((token) => limitationTokens.has(token))),
      );
      if (explicitlyDisliked || namedInLimitations) {
        excluded.add(candidate.slug);
      }
    }
  }

  return excluded;
}

function chooseExercise(role: MovementRole, equipment: EquipmentAccess[], excludedSlugs = new Set<string>()) {
  const available = CANDIDATES[role].filter((candidate) => candidate.equipment.some((value) => equipment.includes(value)));
  const selected = available.find((candidate) => !excludedSlugs.has(candidate.slug));
  if (selected) {
    return selected;
  }
  if (available.length > 0) {
    throw new Error(`No safe ${role.replace(/-/g, " ")} exercise matches the selected equipment and constraints.`);
  }
  return CANDIDATES[role][CANDIDATES[role].length - 1];
}

export function deriveCuratedExerciseTarget(exercise: CuratedPlanExercise) {
  return exercise.measurementType === "time"
    ? {
        measurementType: "time" as const,
        targetRepsMin: null,
        targetRepsMax: null,
        targetDurationSeconds: exercise.targetDurationSeconds ?? 60,
      }
    : {
        measurementType: "reps" as const,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetDurationSeconds: null,
      };
}

export function formatCuratedExerciseTarget(exercise: CuratedPlanExercise) {
  const target = deriveCuratedExerciseTarget(exercise);
  return target.measurementType === "time"
    ? `${exercise.targetSets}x${Math.round(target.targetDurationSeconds / 60)} min`
    : `${exercise.targetSets}x${target.targetRepsMin}-${target.targetRepsMax}`;
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
  const adaptiveExcludedSlugs = new Set([
    ...(signals?.failedExerciseSlugs ?? []),
    ...(signals?.fatiguedExerciseSlugs ?? []),
  ]);
  const intakeExcludedSlugs = buildIntakeConstraintExclusions(data);
  const excludedSlugs = new Set([...adaptiveExcludedSlugs, ...intakeExcludedSlugs]);
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
        measurementType: exercise.measurementType ?? "reps",
        targetSets: role === "cardio" ? 1 : role === "core" || index >= 3 ? Math.min(baseSets, 3) : baseSets,
        targetRepsMin: range.min,
        targetRepsMax: range.max,
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
    limitations: normalizeConstraint(data.limitations ?? ""),
    exerciseDislikes: data.exerciseDislikes.map(normalizeConstraint).filter(Boolean).sort(),
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
    ...(adaptiveExcludedSlugs.size > 0
      ? [`Recent failed-target or fatigue signals replaced ${adaptiveExcludedSlugs.size} exercise choice${adaptiveExcludedSlugs.size === 1 ? "" : "s"} where an equipment-compatible alternative existed.`]
      : []),
    ...(intakeExcludedSlugs.size > 0
      ? [`Your stated limitations or exercise exclusions removed ${intakeExcludedSlugs.size} exercise choice${intakeExcludedSlugs.size === 1 ? "" : "s"}.`]
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
