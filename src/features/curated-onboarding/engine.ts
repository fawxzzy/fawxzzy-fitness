import type {
  CuratedOnboardingData,
  EquipmentAccess,
  PreferredStyle,
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

/**
 * One visible, rule-based reason the routine differs from the first-choice routine for this intake. Every
 * entry names the exercise or schedule it changed and why; nothing is adjusted silently.
 */
export type CuratedPlanAdjustment =
  | { kind: "schedule-reduced"; requestedDays: number; days: number; reason: string }
  | {
      kind: "exercise-swapped";
      dayName: string;
      from: string;
      to: string;
      cause: "failed-target" | "fatigue" | "avoided-equipment";
      reason: string;
    }
  | { kind: "exercise-kept"; dayName: string; exercise: string; reason: string };

export type CuratedWorkoutPlan = {
  version: 1;
  planId: string;
  name: string;
  rationale: string[];
  adjustments: CuratedPlanAdjustment[];
  daysPerWeek: number;
  sessionLengthMinutes: number;
  progressionPlaybookId: "double_progression";
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

/**
 * Closed outcome of one generation attempt. The generator never returns a partial or placeholder routine:
 * it is either `ready`, `blocked` (a safety answer needs a professional first), or `failed` (the intake
 * cannot be turned into a safe routine). Callers branch on `status`, never on message text.
 */
export type CuratedPlanResult =
  | { status: "ready"; plan: CuratedWorkoutPlan }
  | { status: "blocked"; reason: "safety-clearance-required"; message: string; symptoms: string[] }
  | { status: "failed"; reason: "incomplete-intake" | "no-safe-plan"; message: string };

export const CURATED_SAFETY_CLEARANCE_MESSAGE =
  "You reported symptoms during exercise, so a routine cannot be built for you automatically. Check with a qualified professional before starting or changing exercise. You can still build your own routine.";

export class CuratedPlanBlockedError extends Error {
  readonly reason = "safety-clearance-required" as const;
  readonly symptoms: string[];

  constructor(symptoms: string[]) {
    super(CURATED_SAFETY_CLEARANCE_MESSAGE);
    this.name = "CuratedPlanBlockedError";
    this.symptoms = symptoms;
  }
}

/**
 * Reads the `warningSymptoms` safety answer from the raw intake. Any symptom other than "none" requires
 * clearance. A contradictory answer ("none" plus a symptom) fails closed. A missing answer is treated as
 * absent rather than as a symptom, because the questionnaire marks the question required before handoff.
 */
export function evaluateCuratedSafetyGate(data: CuratedOnboardingData):
  | { status: "clear" }
  | { status: "clearance-required"; symptoms: string[] } {
  const raw = data.intakeResponses?.warningSymptoms;
  const selected = Array.isArray(raw) ? raw.filter((value): value is string => typeof value === "string") : [];
  const symptoms = [...new Set(selected.filter((value) => value !== "none"))].sort();
  return symptoms.length > 0 ? { status: "clearance-required", symptoms } : { status: "clear" };
}

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
  emphasisTags?: string[];
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
    { slug: "single-leg-romanian-deadlift", name: "Single-Leg Romanian Deadlift", equipment: ["full-gym", "dumbbells"], emphasisTags: ["glute", "hamstring", "balance"] },
    { slug: "smith-machine-romanian-deadlift", name: "Smith Machine Romanian Deadlift", equipment: ["full-gym", "machines"] },
    { slug: "glute-bridge", name: "Glute Bridge", equipment: ["bodyweight", "bands"], emphasisTags: ["glute", "hip"] },
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

type SplitDay = { name: string; roles: MovementRole[] };

const SPLITS: Record<number, SplitDay[]> = {
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

/**
 * A stated plan style replaces the day-count default only where a standard split exists for that exact
 * day count. Everywhere else the requested days per week decides the split and the style is not claimed.
 */
const STYLE_SPLITS: Partial<Record<PreferredStyle, Record<number, { label: string; days: SplitDay[] }>>> = {
  "push-pull-legs": {
    3: {
      label: "push, pull, legs",
      days: [
        { name: "Push", roles: ["horizontal-push", "vertical-push", "core", "cardio"] },
        { name: "Pull", roles: ["vertical-pull", "horizontal-pull", "hinge", "core"] },
        { name: "Legs", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
      ],
    },
  },
  "upper-lower": {
    2: {
      label: "upper, lower",
      days: [
        { name: "Upper", roles: ["horizontal-push", "vertical-pull", "vertical-push", "horizontal-pull", "core"] },
        { name: "Lower", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
      ],
    },
  },
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
  const equipmentExcluded = new Set<string>();
  const avoidedEquipment = new Set<EquipmentAccess>(data.avoidedEquipment ?? []);
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
      // "full-gym" only says the exercise exists in a gym; the avoided equipment is what the lift needs.
      const needed = candidate.equipment.filter((value) => value !== "full-gym");
      if (avoidedEquipment.size > 0 && needed.length > 0 && needed.every((value) => avoidedEquipment.has(value))) {
        equipmentExcluded.add(candidate.slug);
      }
    }
  }

  return { excluded, limitationExcluded, equipmentExcluded };
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

function isEquipmentCompatible(candidate: ExerciseCandidate, equipment: EquipmentAccess[]) {
  return candidate.equipment.some((value) => equipment.includes(value));
}

function rankRoleCandidates(
  role: MovementRole,
  equipment: EquipmentAccess[],
  excludedSlugs: Set<string>,
  preferences: PreferenceProfile,
) {
  const available = CANDIDATES[role].filter((candidate) => isEquipmentCompatible(candidate, equipment));
  const ranked = available
    .map((candidate, index) => ({
      candidate,
      index,
      score: candidatePreferenceScore(candidate, preferences),
    }))
    .filter(({ candidate }) => !excludedSlugs.has(candidate.slug))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ candidate }) => candidate);
  return { available, ranked };
}

/**
 * First choice for the role using only the member's own dislikes and stated limitations. It is the reference
 * point for explaining a swap and never throws.
 */
function chooseBaselineExercise(
  role: MovementRole,
  equipment: EquipmentAccess[],
  excludedSlugs: Set<string>,
  preferences: PreferenceProfile,
  usedSlugs: Set<string>,
) {
  return rankRoleCandidates(role, equipment, excludedSlugs, preferences)
    .ranked.find((candidate) => !usedSlugs.has(candidate.slug)) ?? null;
}

function chooseExercise(
  role: MovementRole,
  equipment: EquipmentAccess[],
  hardExcludedSlugs: Set<string>,
  softExcludedSlugs: Set<string>,
  omittableSlugs: Set<string>,
  preferences: PreferenceProfile,
  usedSlugs: Set<string>,
): { exercise: ExerciseCandidate | null; keptDespiteSignal: boolean } {
  const { available, ranked } = rankRoleCandidates(role, equipment, hardExcludedSlugs, preferences);
  if (ranked.length > 0) {
    // One exercise never appears twice in the same day; a role whose only safe lift is already used is skipped.
    const unflagged = ranked.filter((candidate) => !softExcludedSlugs.has(candidate.slug));
    if (unflagged.length > 0) {
      return { exercise: unflagged.find((candidate) => !usedSlugs.has(candidate.slug)) ?? null, keptDespiteSignal: false };
    }
    // History flagged every safe lift for this role. Keep the first choice and say so, instead of failing.
    return { exercise: ranked.find((candidate) => !usedSlugs.has(candidate.slug)) ?? null, keptDespiteSignal: true };
  }
  if (available.length > 0) {
    if (available.some((candidate) => omittableSlugs.has(candidate.slug))) {
      return { exercise: null, keptDespiteSignal: false };
    }
    throw new Error(`No safe ${role.replace(/-/g, " ")} exercise matches the selected equipment and constraints.`);
  }
  return { exercise: null, keptDespiteSignal: false };
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

/** A workout day with fewer lifts than this is not a workout; generation fails closed instead. */
const MIN_EXERCISES_PER_DAY = 3;

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
  const safetyGate = evaluateCuratedSafetyGate(data);
  if (safetyGate.status === "clearance-required") {
    throw new CuratedPlanBlockedError(safetyGate.symptoms);
  }

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
  const intakeConstraints = buildIntakeConstraintExclusions(data);
  const hardExcludedSlugs = new Set([
    ...intakeConstraints.excluded,
    ...intakeConstraints.equipmentExcluded,
  ]);
  const failedSlugs = new Set(signals?.failedExerciseSlugs ?? []);
  const fatiguedSlugs = new Set(signals?.fatiguedExerciseSlugs ?? []);
  // A role whose every compatible lift was removed by a stated limitation or by equipment the member asked to
  // avoid is left out of the day. A role emptied only by dislikes or adaptive signals still fails closed.
  const omittableSlugs = new Set([
    ...intakeConstraints.limitationExcluded,
    ...intakeConstraints.equipmentExcluded,
  ]);
  const compatibleSlugs = new Set(
    Object.values(CANDIDATES)
      .flat()
      .filter((candidate) => isEquipmentCompatible(candidate, equipment))
      .map((candidate) => candidate.slug),
  );
  const avoidedEquipmentExclusionCount = [...intakeConstraints.equipmentExcluded]
    .filter((slug) => compatibleSlugs.has(slug) && !intakeConstraints.excluded.has(slug))
    .length;
  const preferences = buildPreferenceProfile(data);
  const exerciseLimit = sessionLengthMinutes <= 30 ? 4 : sessionLengthMinutes <= 45 ? 5 : sessionLengthMinutes <= 60 ? 6 : 7;
  const baseSets = data.experience === "beginner" ? 3 : goal === "get-stronger" ? 4 : 3;
  const styleSplit = data.preferredStyle ? STYLE_SPLITS[data.preferredStyle]?.[daysPerWeek] : undefined;
  const split = styleSplit?.days ?? SPLITS[daysPerWeek];
  const days = split.map((day) => {
    const usedSlugs = new Set<string>();
    const baselineUsedSlugs = new Set<string>();
    const selections: Array<{
      role: MovementRole;
      exercise: ExerciseCandidate;
      adjustment: CuratedPlanAdjustment | null;
    }> = [];
    for (const role of rankRolesByTargetAreas(day.roles, preferences)) {
      const choice = chooseExercise(
        role,
        equipment,
        hardExcludedSlugs,
        adaptiveExcludedSlugs,
        omittableSlugs,
        preferences,
        usedSlugs,
      );
      const baseline = chooseBaselineExercise(role, equipment, intakeConstraints.excluded, preferences, baselineUsedSlugs);
      if (baseline) baselineUsedSlugs.add(baseline.slug);
      const exercise = choice.exercise;
      if (!exercise) continue;
      usedSlugs.add(exercise.slug);

      let adjustment: CuratedPlanAdjustment | null = null;
      if (baseline && baseline.slug !== exercise.slug) {
        if (failedSlugs.has(baseline.slug)) {
          adjustment = {
            kind: "exercise-swapped",
            dayName: day.name,
            from: baseline.name,
            to: exercise.name,
            cause: "failed-target",
            reason: `Recent session feedback marked ${baseline.name} as too hard, a form breakdown or pain, so ${exercise.name} replaces it on ${day.name}.`,
          };
        } else if (fatiguedSlugs.has(baseline.slug)) {
          adjustment = {
            kind: "exercise-swapped",
            dayName: day.name,
            from: baseline.name,
            to: exercise.name,
            cause: "fatigue",
            reason: `Recent session feedback marked ${baseline.name} as too hard or a bad day, so ${exercise.name} replaces it on ${day.name}.`,
          };
        } else if (intakeConstraints.equipmentExcluded.has(baseline.slug)) {
          adjustment = {
            kind: "exercise-swapped",
            dayName: day.name,
            from: baseline.name,
            to: exercise.name,
            cause: "avoided-equipment",
            reason: `You asked to avoid the equipment ${baseline.name} needs, so ${exercise.name} replaces it on ${day.name}.`,
          };
        }
      } else if (choice.keptDespiteSignal) {
        adjustment = {
          kind: "exercise-kept",
          dayName: day.name,
          exercise: exercise.name,
          reason: `Recent feedback flagged ${exercise.name}, but no safe alternative fits your equipment, so it stays on ${day.name}. Edit it after creating the routine if it is still a problem.`,
        };
      }
      selections.push({ role, exercise, adjustment });
    }

    const kept = selections.slice(0, exerciseLimit);
    return {
      name: day.name,
      adjustments: kept.flatMap(({ adjustment }) => (adjustment ? [adjustment] : [])),
      exercises: kept.map(({ role, exercise }, index) => {
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
    };
  });
  const emptyDay = days.find((day) => day.exercises.length === 0);
  if (emptyDay) {
    throw new Error(
      `No safe exercises remain for ${emptyDay.name}. Adjust the selected equipment or constraints before generating the plan.`,
    );
  }
  const thinDay = days.find((day) => day.exercises.length < MIN_EXERCISES_PER_DAY);
  if (thinDay) {
    throw new Error(
      `Too few safe exercises remain for ${thinDay.name} (${thinDay.exercises.length} of ${MIN_EXERCISES_PER_DAY} needed). Adjust the selected equipment or constraints before generating the plan.`,
    );
  }
  const nameByGoal: Record<TrainingGoal, string> = {
    "build-muscle": "Atlas Muscle",
    "get-leaner": "Atlas Lean",
    "get-stronger": "Atlas Strength",
    "general-fitness": "Atlas Fitness",
  };
  const sortedEquipment = [...equipment].sort();
  const avoidedEquipment = [...new Set(data.avoidedEquipment ?? [])].sort();
  const stableInput = JSON.stringify({
    goal,
    experience: data.experience,
    daysPerWeek,
    sessionLengthMinutes,
    equipment: sortedEquipment,
    preferredStyle: data.preferredStyle ?? null,
    cardioPreference: data.cardioPreference ?? null,
    limitations: normalizeConstraint(data.limitations ?? ""),
    exerciseDislikes: data.exerciseDislikes.map(normalizeConstraint).filter(Boolean).sort(),
    exerciseLikes: data.exerciseLikes.map(normalizeConstraint).filter(Boolean).sort(),
    targetAreas: data.targetAreas.map(normalizeConstraint).filter(Boolean).sort(),
    adaptiveSignals: signals ? {
      completionRate: signals.completionRate,
      missedWorkoutCount: signals.missedWorkoutCount,
      failedExerciseSlugs: [...signals.failedExerciseSlugs].sort(),
      fatiguedExerciseSlugs: [...signals.fatiguedExerciseSlugs].sort(),
    } : null,
    ...(avoidedEquipment.length > 0 ? { avoidedEquipment } : {}),
  });

  const scheduleReason = `Recent completion supports ${daysPerWeek} days instead of the requested ${requestedDaysPerWeek}; the draft stays editable.`;
  const adjustments: CuratedPlanAdjustment[] = [
    ...(shouldReduceSchedule
      ? [{ kind: "schedule-reduced" as const, requestedDays: requestedDaysPerWeek, days: daysPerWeek, reason: scheduleReason }]
      : []),
    ...days.flatMap((day) => day.adjustments),
  ];
  const historyReplacedCount = new Set(
    adjustments.flatMap((adjustment) => (
      adjustment.kind === "exercise-swapped" && adjustment.cause !== "avoided-equipment" ? [adjustment.from] : []
    )),
  ).size;
  const adaptiveRationale = [
    ...(signals && signals.completionRate !== null
      ? [`Based on your last 28 days: ${Math.round(signals.completionRate * 100)}% of planned workouts completed.`]
      : []),
    ...(shouldReduceSchedule ? [scheduleReason] : []),
    ...(historyReplacedCount > 0
      ? [`Recent failed-target or fatigue signals replaced ${historyReplacedCount} exercise choice${historyReplacedCount === 1 ? "" : "s"} where an equipment-compatible alternative existed.`]
      : []),
    ...(intakeConstraints.excluded.size > 0
      ? [`Your stated limitations or exercise exclusions removed ${intakeConstraints.excluded.size} exercise choice${intakeConstraints.excluded.size === 1 ? "" : "s"}.`]
      : []),
    ...(avoidedEquipmentExclusionCount > 0
      ? [`Equipment you asked to avoid removed ${avoidedEquipmentExclusionCount} exercise choice${avoidedEquipmentExclusionCount === 1 ? "" : "s"}.`]
      : []),
    ...(styleSplit
      ? [`A ${styleSplit.label} split matches your plan style.`]
      : []),
    ...(preferences.exerciseLikes.length > 0 || preferences.targetTokens.size > 0
      ? ["Your preferred exercises and target areas shape the order of safe, equipment-compatible choices."]
      : []),
  ];

  return {
    version: 1,
    planId: `curated-${hashPlan(stableInput)}`,
    name: nameByGoal[goal],
    rationale: [
      `${daysPerWeek} training days sized for ${sessionLengthMinutes}-minute sessions.`,
      `Exercise choices are limited to ${sortedEquipment.join(", ")}.`,
      `${data.experience} ${goal.replace(/-/g, " ")} targets use double progression.`,
      ...adaptiveRationale,
    ],
    adjustments,
    daysPerWeek,
    sessionLengthMinutes,
    progressionPlaybookId: "double_progression",
    days: days.map(({ name, exercises }) => ({ name, exercises })),
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

/**
 * Non-throwing entry point for callers that must show the user a closed outcome. Same generator, same
 * determinism; blocked and failed outcomes carry a stable `reason` code plus user-safe copy.
 */
export function resolveCuratedWorkoutPlan(
  data: CuratedOnboardingData,
  signals: CuratedHistorySignals | null = null,
): CuratedPlanResult {
  try {
    return { status: "ready", plan: generateCuratedWorkoutPlanWithSignals(data, signals) };
  } catch (error) {
    if (error instanceof CuratedPlanBlockedError) {
      return {
        status: "blocked",
        reason: error.reason,
        message: error.message,
        symptoms: error.symptoms,
      };
    }
    const message = error instanceof Error ? error.message : "The curated routine could not be generated.";
    return {
      status: "failed",
      reason: message.startsWith("Complete goal") ? "incomplete-intake" : "no-safe-plan",
      message,
    };
  }
}

export function buildCuratedRoutineSchedule(plan: CuratedWorkoutPlan): CuratedRoutineScheduleDay[] {
  const cycleLengthDays = 7;
  const trainingDayCount = plan.days.length;

  if (trainingDayCount < 1 || trainingDayCount > cycleLengthDays) {
    throw new Error("Curated routines require between one and seven training days.");
  }

  const trainingDayByIndex = new Map(
    plan.days.map((planDay, index) => [Math.floor((index * cycleLengthDays) / trainingDayCount) + 1, planDay]),
  );

  return Array.from({ length: cycleLengthDays }, (_, index) => ({
    dayIndex: index + 1,
    planDay: trainingDayByIndex.get(index + 1) ?? null,
  }));
}
