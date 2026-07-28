import type {
  CuratedOnboardingData,
  EquipmentAccess,
  TrainingGoal,
} from "./types.ts";
import {
  CURATED_PLANNING_ALGORITHM_VERSION,
  CURATED_PLANNING_CONTRACT_VERSION,
  normalizeCuratedPlanningContract,
  sha256Hex,
  type CuratedWeekdayIndex,
} from "./planning-contract.ts";

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
  version: 2;
  planId: string;
  name: string;
  rationale: string[];
  daysPerWeek: number;
  sessionLengthMinutes: number;
  progressionPlaybookId: "double_progression";
  trainingDayIndexes: CuratedWeekdayIndex[] | null;
  provenance: {
    planningContractVersion: typeof CURATED_PLANNING_CONTRACT_VERSION;
    planningAlgorithmVersion: typeof CURATED_PLANNING_ALGORITHM_VERSION;
    planningDigestAlgorithm: "sha256";
    planningDigest: string;
    catalogVersion: "legacy-static-v1";
  };
  days: CuratedPlanDay[];
};

export type CuratedRoutineScheduleDay = {
  dayIndex: number;
  planDay: CuratedPlanDay | null;
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
  requiredEquipment?: {
    all?: string[];
    any?: string[];
  };
  measurementType?: "reps" | "time";
  targetDurationSeconds?: number;
  emphasisTags?: string[];
};

const CANDIDATES: Record<MovementRole, ExerciseCandidate[]> = {
  squat: [
    { slug: "back-squat", name: "Back Squat", equipment: ["full-gym", "barbell"], requiredEquipment: { all: ["barbells", "squat-rack"] } },
    { slug: "leg-press", name: "Leg Press", equipment: ["full-gym", "machines"], requiredEquipment: { all: ["machines"] } },
    { slug: "goblet-squat", name: "Goblet Squat", equipment: ["full-gym", "dumbbells"], requiredEquipment: { any: ["dumbbells", "kettlebells"] } },
    { slug: "bodyweight-walking-lunge", name: "Bodyweight Walking Lunge", equipment: ["bodyweight"], requiredEquipment: { all: ["bodyweight"] } },
  ],
  hinge: [
    { slug: "romanian-deadlift", name: "Romanian Deadlift", equipment: ["full-gym", "barbell"], requiredEquipment: { all: ["barbells"] } },
    { slug: "single-leg-romanian-deadlift", name: "Single-Leg Romanian Deadlift", equipment: ["full-gym", "dumbbells"], requiredEquipment: { all: ["dumbbells"] }, emphasisTags: ["glute", "hamstring", "balance"] },
    { slug: "smith-machine-romanian-deadlift", name: "Smith Machine Romanian Deadlift", equipment: ["full-gym", "machines"], requiredEquipment: { all: ["smith-machine"] } },
    { slug: "glute-bridge", name: "Glute Bridge", equipment: ["bodyweight", "bands"], requiredEquipment: { any: ["bodyweight", "resistance-bands"] }, emphasisTags: ["glute", "hip"] },
  ],
  "horizontal-push": [
    { slug: "barbell-bench-press", name: "Barbell Bench Press", equipment: ["full-gym", "barbell"], requiredEquipment: { all: ["barbells"], any: ["bench", "incline-bench"] } },
    { slug: "dumbbell-bench-press", name: "Dumbbell Bench Press", equipment: ["full-gym", "dumbbells"], requiredEquipment: { all: ["dumbbells"], any: ["bench", "incline-bench"] } },
    { slug: "smith-machine-bench-press", name: "Smith Machine Bench Press", equipment: ["full-gym", "machines"], requiredEquipment: { all: ["smith-machine"] } },
    { slug: "push-up", name: "Push-Up", equipment: ["bodyweight", "bands"], requiredEquipment: { any: ["bodyweight", "resistance-bands"] } },
  ],
  "vertical-push": [
    { slug: "overhead-press", name: "Overhead Press", equipment: ["full-gym", "barbell"], requiredEquipment: { all: ["barbells"] } },
    { slug: "seated-dumbbell-shoulder-press", name: "Seated Dumbbell Shoulder Press", equipment: ["full-gym", "dumbbells"], requiredEquipment: { all: ["dumbbells"], any: ["bench", "incline-bench"] } },
    { slug: "machine-shoulder-press", name: "Machine Shoulder Press", equipment: ["full-gym", "machines"], requiredEquipment: { all: ["machines"] } },
    { slug: "pike-push-up", name: "Pike Push-Up", equipment: ["bodyweight", "bands"], requiredEquipment: { any: ["bodyweight", "resistance-bands"] } },
  ],
  "horizontal-pull": [
    { slug: "barbell-row", name: "Barbell Row", equipment: ["full-gym", "barbell"], requiredEquipment: { all: ["barbells"] } },
    { slug: "single-arm-dumbbell-row", name: "Single-Arm Dumbbell Row", equipment: ["full-gym", "dumbbells"], requiredEquipment: { all: ["dumbbells"] } },
    { slug: "seated-cable-row", name: "Seated Cable Row", equipment: ["full-gym", "machines"], requiredEquipment: { all: ["cables"] } },
    { slug: "inverted-row", name: "Inverted Row", equipment: ["bodyweight", "bands"], requiredEquipment: { any: ["pull-up-bar", "resistance-bands"] } },
  ],
  "vertical-pull": [
    { slug: "lat-pulldown", name: "Lat Pulldown", equipment: ["full-gym", "machines"], requiredEquipment: { any: ["machines", "cables"] } },
    { slug: "pull-up", name: "Pull-Up", equipment: ["bodyweight", "full-gym"], requiredEquipment: { all: ["pull-up-bar"] } },
    { slug: "single-arm-dumbbell-row", name: "Single-Arm Dumbbell Row", equipment: ["dumbbells"], requiredEquipment: { all: ["dumbbells"] } },
    { slug: "inverted-row", name: "Inverted Row", equipment: ["bands"], requiredEquipment: { any: ["pull-up-bar", "resistance-bands"] } },
  ],
  lunge: [
    { slug: "walking-lunge", name: "Walking Lunge", equipment: ["full-gym", "dumbbells"], requiredEquipment: { all: ["dumbbells"] } },
    { slug: "reverse-lunge", name: "Reverse Lunge", equipment: ["full-gym", "barbell", "dumbbells"], requiredEquipment: { any: ["barbells", "dumbbells"] } },
    { slug: "single-leg-press", name: "Single-Leg Press", equipment: ["machines"], requiredEquipment: { all: ["machines"] } },
    { slug: "bodyweight-walking-lunge", name: "Bodyweight Walking Lunge", equipment: ["bodyweight", "bands"], requiredEquipment: { any: ["bodyweight", "resistance-bands"] } },
  ],
  core: [
    { slug: "plank", name: "Plank", equipment: ["full-gym", "barbell", "dumbbells", "machines", "bands", "bodyweight"], requiredEquipment: { all: ["bodyweight"] }, measurementType: "time", targetDurationSeconds: 60 },
  ],
  cardio: [
    { slug: "incline-walk", name: "Incline Walk", equipment: ["full-gym", "machines"], requiredEquipment: { all: ["treadmill"] }, measurementType: "time", targetDurationSeconds: 600 },
    { slug: "mountain-climber", name: "Mountain Climber", equipment: ["barbell", "dumbbells", "bands", "bodyweight"], requiredEquipment: { all: ["bodyweight"] }, measurementType: "time", targetDurationSeconds: 60 },
  ],
};

const SPLITS: Record<number, Array<{ name: string; roles: MovementRole[] }>> = {
  1: [
    { name: "Full Body", roles: ["squat", "horizontal-push", "vertical-pull", "hinge", "core", "cardio"] },
  ],
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
  7: [
    { name: "Push A", roles: ["horizontal-push", "vertical-push", "lunge", "core", "cardio"] },
    { name: "Pull A", roles: ["hinge", "vertical-pull", "horizontal-pull", "core", "cardio"] },
    { name: "Legs A", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
    { name: "Push B", roles: ["vertical-push", "horizontal-push", "lunge", "core", "cardio"] },
    { name: "Pull B", roles: ["horizontal-pull", "vertical-pull", "hinge", "core", "cardio"] },
    { name: "Legs B", roles: ["lunge", "squat", "hinge", "core", "cardio"] },
    { name: "Conditioning + Core", roles: ["cardio", "core", "lunge", "horizontal-pull"] },
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

const LIMITATION_ROLE_CONSTRAINTS: Array<{ phrases: string[]; roles: MovementRole[] }> = [
  { phrases: ["overhead", "shoulder"], roles: ["vertical-push"] },
  { phrases: ["knee"], roles: ["squat", "lunge"] },
  { phrases: ["low back", "lower back"], roles: ["squat", "hinge"] },
];

const TARGET_AREA_ROLES: Record<string, MovementRole[]> = {
  ab: ["core"],
  back: ["horizontal-pull", "vertical-pull"],
  cardio: ["cardio"],
  chest: ["horizontal-push"],
  conditioning: ["cardio"],
  glute: ["hinge", "squat", "lunge"],
  hamstring: ["hinge"],
  leg: ["squat", "hinge", "lunge"],
  quad: ["squat", "lunge"],
  shoulder: ["vertical-push"],
};

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
  const limitationExcluded = new Set<string>();
  const limitationRoles = new Set(
    LIMITATION_ROLE_CONSTRAINTS
      .filter(({ phrases }) => phrases.some((phrase) => limitationText.includes(phrase)))
      .flatMap(({ roles }) => roles),
  );

  for (const [role, candidates] of Object.entries(CANDIDATES) as Array<[MovementRole, ExerciseCandidate[]]>) {
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
      const roleLimited = limitationRoles.has(role);
      if (namedInLimitations || roleLimited) {
        limitationExcluded.add(candidate.slug);
      }
      if (explicitlyDisliked || namedInLimitations || roleLimited) {
        excluded.add(candidate.slug);
      }
    }
  }

  return { excluded, limitationExcluded };
}

type PreferenceProfile = {
  exerciseLikes: string[];
  preferredRoles: Set<MovementRole>;
  targetTokens: Set<string>;
};

function buildPreferenceProfile(data: CuratedOnboardingData): PreferenceProfile {
  const targetTokens = new Set(data.targetAreas.flatMap(constraintTokens));
  return {
    exerciseLikes: data.exerciseLikes.map(normalizeConstraint).filter(Boolean),
    preferredRoles: new Set(
      [...targetTokens].flatMap((token) => TARGET_AREA_ROLES[token] ?? []),
    ),
    targetTokens,
  };
}

function candidatePreferenceScore(candidate: ExerciseCandidate, preferences: PreferenceProfile) {
  const normalizedName = normalizeConstraint(candidate.name);
  const normalizedSlug = normalizeConstraint(candidate.slug);
  const likeScore = preferences.exerciseLikes.reduce((score, like) => {
    if (like === normalizedName || like === normalizedSlug) return Math.max(score, 3);
    if (normalizedName.includes(like) || normalizedSlug.includes(like)) return Math.max(score, 2);
    return score;
  }, 0);
  const targetScore = (candidate.emphasisTags ?? [])
    .map(normalizeConstraint)
    .filter((tag) => preferences.targetTokens.has(tag))
    .length;
  return likeScore * 10 + targetScore;
}

function rankRolesByTargetAreas(roles: MovementRole[], preferences: PreferenceProfile) {
  return roles
    .map((role, index) => ({ role, index }))
    .sort((left, right) => (
      Number(preferences.preferredRoles.has(right.role))
      - Number(preferences.preferredRoles.has(left.role))
      || left.index - right.index
    ))
    .map(({ role }) => role);
}

type EquipmentProfile = {
  access: EquipmentAccess[];
  declaredCapabilities: Set<string> | null;
  avoided: string[];
  adaptiveAccess: EquipmentAccess[] | null;
};

const BROAD_AVOIDANCE_FAMILIES: Record<string, string[]> = {
  machine: ["machines", "smith-machine", "cables", "treadmill", "bike"],
  "machine equipment": ["machines", "smith-machine", "cables", "treadmill", "bike"],
  "cardio machine": ["treadmill", "bike"],
  "free weight": ["barbells", "dumbbells", "kettlebells"],
};

function normalizeEquipmentTerm(value: string) {
  return constraintTokens(value).join(" ");
}

function isEquipmentCapabilityAvoided(capability: string, avoided: string[]) {
  const normalizedCapability = normalizeEquipmentTerm(capability);
  return avoided.some((value) => {
    const normalizedAvoidance = normalizeEquipmentTerm(value);
    if (!normalizedAvoidance) return false;
    const broadCapabilities = BROAD_AVOIDANCE_FAMILIES[normalizedAvoidance];
    if (broadCapabilities?.some((entry) => normalizeEquipmentTerm(entry) === normalizedCapability)) {
      return true;
    }
    return (
      normalizedAvoidance === normalizedCapability
      || normalizedAvoidance.includes(normalizedCapability)
      || normalizedCapability.includes(normalizedAvoidance)
    );
  });
}

function candidateMatchesEquipment(
  candidate: ExerciseCandidate,
  profile: EquipmentProfile,
) {
  if (
    profile.adaptiveAccess
    && !candidate.equipment.some((value) => profile.adaptiveAccess?.includes(value))
  ) {
    return false;
  }

  if (!profile.declaredCapabilities) {
    return candidate.equipment.some(
      (value) => profile.access.includes(value) && !isEquipmentCapabilityAvoided(value, profile.avoided),
    );
  }

  const requiredAll = candidate.requiredEquipment?.all ?? [];
  const requiredAny = candidate.requiredEquipment?.any ?? [];
  const hasUsableCapability = (capability: string) => (
    Boolean(profile.declaredCapabilities?.has(capability))
    && !isEquipmentCapabilityAvoided(capability, profile.avoided)
  );

  return (
    requiredAll.every(hasUsableCapability)
    && (requiredAny.length === 0 || requiredAny.some(hasUsableCapability))
  );
}

function chooseExercise(
  role: MovementRole,
  equipment: EquipmentProfile,
  excludedSlugs: Set<string>,
  limitationExcludedSlugs: Set<string>,
  preferences: PreferenceProfile,
) {
  const available = CANDIDATES[role].filter((candidate) => candidateMatchesEquipment(candidate, equipment));
  const selected = available
    .map((candidate, index) => ({
      candidate,
      index,
      score: candidatePreferenceScore(candidate, preferences),
    }))
    .filter(({ candidate }) => !excludedSlugs.has(candidate.slug))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .at(0)?.candidate;
  if (selected) {
    return selected;
  }
  if (available.length > 0) {
    if (available.some((candidate) => limitationExcludedSlugs.has(candidate.slug))) {
      return null;
    }
    throw new Error(`No safe ${role.replace(/-/g, " ")} exercise matches the selected equipment and constraints.`);
  }
  return null;
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

function validateIntake(
  planning: ReturnType<typeof normalizeCuratedPlanningContract>,
) {
  return Boolean(
    planning.goals.primary
    && planning.experience.level
    && planning.schedule.daysPerWeek
    && SPLITS[planning.schedule.daysPerWeek]
    && planning.schedule.sessionLengthMinutes
    && (planning.equipment.access.length > 0 || planning.equipment.available.length > 0),
  );
}

function generateCuratedWorkoutPlanWithSignals(
  data: CuratedOnboardingData,
  signals: CuratedHistorySignals | null,
): CuratedWorkoutPlan {
  const planning = normalizeCuratedPlanningContract(data);
  if (planning.status === "blocked") {
    throw new Error(`Curated plan generation is blocked: ${planning.blockerCodes.join(", ")}.`);
  }
  if (!validateIntake(planning)) {
    throw new Error("Complete goal, experience, equipment, schedule, and session length before generating a plan.");
  }

  const goal = planning.goals.primary as TrainingGoal;
  const requestedDaysPerWeek = planning.schedule.daysPerWeek as number;
  const hasExactWeekdaySchedule = planning.schedule.mode === "exact-weekdays";
  const shouldReduceSchedule = Boolean(
    signals
    && !hasExactWeekdaySchedule
    && requestedDaysPerWeek > 2
    && (signals.missedWorkoutCount >= 2 || (signals.completionRate !== null && signals.completionRate < 0.6)),
  );
  const daysPerWeek = shouldReduceSchedule ? requestedDaysPerWeek - 1 : requestedDaysPerWeek;
  const sessionLengthMinutes = planning.schedule.sessionLengthMinutes as number;
  const signalEquipment = signals?.availableEquipment ?? [];
  const equipmentAccess = signalEquipment.length === 0 || signalEquipment.includes("full-gym")
    ? planning.equipment.access
    : planning.equipment.access.filter((value) => signalEquipment.includes(value));
  if (equipmentAccess.length === 0 && planning.equipment.available.length === 0) {
    throw new Error("No declared equipment remains available for curated plan generation.");
  }
  const equipmentProfile: EquipmentProfile = {
    access: equipmentAccess,
    declaredCapabilities: planning.equipment.available.length > 0
      ? new Set(planning.equipment.available)
      : null,
    avoided: planning.equipment.avoid,
    adaptiveAccess: signalEquipment.length > 0 && !signalEquipment.includes("full-gym")
      ? signalEquipment
      : null,
  };
  const normalizedData: CuratedOnboardingData = {
    ...data,
    trainingGoal: goal,
    experience: planning.experience.level,
    daysPerWeek,
    sessionLengthMinutes,
    equipment: equipmentAccess,
    preferredStyle: planning.preferences.style,
    cardioPreference: planning.preferences.cardio,
    limitations: planning.safety.limitations.join("\n"),
    exerciseLikes: planning.preferences.exerciseLikes,
    exerciseDislikes: planning.preferences.exerciseDislikes,
    targetAreas: planning.goals.targetAreas,
  };
  const adaptiveExcludedSlugs = new Set([
    ...(signals?.failedExerciseSlugs ?? []),
    ...(signals?.fatiguedExerciseSlugs ?? []),
  ]);
  const intakeConstraints = buildIntakeConstraintExclusions(normalizedData);
  const excludedSlugs = new Set([...adaptiveExcludedSlugs, ...intakeConstraints.excluded]);
  const preferences = buildPreferenceProfile(normalizedData);
  const exerciseLimit = sessionLengthMinutes <= 30 ? 4 : sessionLengthMinutes <= 45 ? 5 : sessionLengthMinutes <= 60 ? 6 : 7;
  const baseSets = planning.experience.level === "beginner" ? 3 : goal === "get-stronger" ? 4 : 3;
  const split = SPLITS[daysPerWeek];
  const days = split.map((day) => ({
    name: day.name,
    exercises: rankRolesByTargetAreas(day.roles, preferences)
      .map((role) => ({
        role,
        exercise: chooseExercise(
          role,
          equipmentProfile,
          excludedSlugs,
          intakeConstraints.limitationExcluded,
          preferences,
        ),
      }))
      .filter((selection): selection is { role: MovementRole; exercise: ExerciseCandidate } => Boolean(selection.exercise))
      .slice(0, exerciseLimit)
      .map(({ role, exercise }, index) => {
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
  const emptyDay = days.find((day) => day.exercises.length === 0);
  if (emptyDay) {
    throw new Error(
      `No safe exercises remain for ${emptyDay.name}. Adjust the selected equipment or constraints before generating the plan.`,
    );
  }
  const nameByGoal: Record<TrainingGoal, string> = {
    "build-muscle": "Atlas Muscle",
    "get-leaner": "Atlas Lean",
    "get-stronger": "Atlas Strength",
    "general-fitness": "Atlas Fitness",
  };
  const stableInput = JSON.stringify({
    planningDigest: planning.provenance.digest,
    daysPerWeek,
    equipment: [...equipmentAccess].sort(),
    equipmentCapabilities: [...planning.equipment.available].sort(),
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
    ...(intakeConstraints.excluded.size > 0
      ? [`Your stated limitations or exercise exclusions removed ${intakeConstraints.excluded.size} exercise choice${intakeConstraints.excluded.size === 1 ? "" : "s"}.`]
      : []),
    ...(preferences.exerciseLikes.length > 0 || preferences.targetTokens.size > 0
      ? ["Your preferred exercises and target areas shape the order of safe, equipment-compatible choices."]
      : []),
    ...(hasExactWeekdaySchedule
      ? ["Your exact selected weekdays are preserved in the routine schedule."]
      : []),
  ];

  return {
    version: 2,
    planId: `curated-${sha256Hex(stableInput).slice(0, 16)}`,
    name: nameByGoal[goal],
    rationale: [
      `${daysPerWeek} training days sized for ${sessionLengthMinutes}-minute sessions.`,
      `Exercise choices are limited to ${(
        planning.equipment.available.length > 0
          ? planning.equipment.available
          : equipmentAccess
      ).join(", ")}.`,
      `${planning.experience.level} ${goal.replace(/-/g, " ")} targets use double progression.`,
      ...adaptiveRationale,
    ],
    daysPerWeek,
    sessionLengthMinutes,
    progressionPlaybookId: "double_progression",
    trainingDayIndexes: hasExactWeekdaySchedule
      ? planning.schedule.preferredWeekdayIndexes
      : null,
    provenance: {
      planningContractVersion: CURATED_PLANNING_CONTRACT_VERSION,
      planningAlgorithmVersion: CURATED_PLANNING_ALGORITHM_VERSION,
      planningDigestAlgorithm: "sha256",
      planningDigest: planning.provenance.digest,
      catalogVersion: "legacy-static-v1",
    },
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

export function buildCuratedRoutineSchedule(plan: CuratedWorkoutPlan): CuratedRoutineScheduleDay[] {
  const cycleLengthDays = 7;
  const trainingDayCount = plan.days.length;

  if (trainingDayCount < 1 || trainingDayCount > cycleLengthDays) {
    throw new Error("Curated routines require between one and seven training days.");
  }

  const trainingDayIndexes = plan.trainingDayIndexes
    ?? plan.days.map((_, index) => Math.floor((index * cycleLengthDays) / trainingDayCount) + 1);
  if (
    trainingDayIndexes.length !== trainingDayCount
    || new Set(trainingDayIndexes).size !== trainingDayIndexes.length
    || trainingDayIndexes.some((dayIndex) => dayIndex < 1 || dayIndex > cycleLengthDays)
  ) {
    throw new Error("Curated routine weekday scheduling does not match the generated training days.");
  }

  const trainingDayByIndex = new Map(
    plan.days.map((planDay, index) => [trainingDayIndexes[index], planDay]),
  );

  return Array.from({ length: cycleLengthDays }, (_, index) => ({
    dayIndex: index + 1,
    planDay: trainingDayByIndex.get(index + 1) ?? null,
  }));
}
