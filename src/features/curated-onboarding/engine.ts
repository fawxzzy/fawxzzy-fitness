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
 * One visible, rule-based reason the routine differs from the first-choice routine for this intake (the routine
 * built from the member's own limitations and dislikes alone, on the same split). Every exercise that appears in
 * or disappears from a day relative to that first choice is named by exactly these entries.
 */
export type CuratedPlanAdjustment =
  | { kind: "schedule-reduced"; requestedDays: number; days: number; reason: string }
  | {
      kind: "exercise-swapped";
      dayName: string;
      from: string;
      to: string;
      cause: "failed-target" | "fatigue" | "pain-or-form" | "avoided-equipment";
      reason: string;
    }
  | { kind: "exercise-omitted"; dayName: string; exercise: string; cause: "pain-or-form"; reason: string }
  | { kind: "exercise-kept"; dayName: string; exercise: string; reason: string }
  | { kind: "day-adjusted"; dayName: string; removed: string[]; added: string[]; reason: string };

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
  /** Lifts marked "too hard". A flagged lift may stay, with a visible reason, when nothing else fits. */
  failedExerciseSlugs: string[];
  /** Lifts marked "too hard" or "bad day". A flagged lift may stay, with a visible reason, when nothing else fits. */
  fatiguedExerciseSlugs: string[];
  /** Lifts marked as a form breakdown or pain. These are always left out of the routine, never kept. */
  painOrFormExerciseSlugs?: string[];
  availableEquipment?: EquipmentAccess[];
};

/**
 * Closed outcome of one generation attempt. The generator never returns a partial or placeholder routine:
 * it is either `ready`, `blocked` (a safety or permission answer needs a person first), or `failed` (the
 * intake cannot be turned into a routine). Callers branch on `status`/`reason`, never on message text.
 */
export type CuratedBlockedReason = "safety-clearance-required" | "guardian-permission-required";

export type CuratedPlanResult =
  | { status: "ready"; plan: CuratedWorkoutPlan }
  | { status: "blocked"; reason: CuratedBlockedReason; message: string; symptoms: string[] }
  | { status: "failed"; reason: "incomplete-intake" | "no-safe-plan"; message: string };

export const CURATED_SAFETY_CLEARANCE_MESSAGE =
  "You reported a symptom or a health condition that needs a professional's input, so a routine cannot be built for you automatically. Check with a qualified professional before starting or changing exercise. You can still build your own routine.";

export const CURATED_GUARDIAN_PERMISSION_MESSAGE =
  "A routine can only be built for someone under 18 with a parent or guardian's permission. Ask a parent or guardian to help with your setup, or build your own routine.";

export const CURATED_INTAKE_INCOMPLETE_MESSAGE =
  "Complete goal, experience, equipment, schedule, session length, and the safety questions before generating a routine.";

export class CuratedPlanBlockedError extends Error {
  readonly reason: CuratedBlockedReason;
  readonly symptoms: string[];

  constructor(reason: CuratedBlockedReason, symptoms: string[] = []) {
    super(reason === "guardian-permission-required" ? CURATED_GUARDIAN_PERMISSION_MESSAGE : CURATED_SAFETY_CLEARANCE_MESSAGE);
    this.name = "CuratedPlanBlockedError";
    this.reason = reason;
    this.symptoms = symptoms;
  }
}

export class CuratedIntakeIncompleteError extends Error {
  constructor(message: string = CURATED_INTAKE_INCOMPLETE_MESSAGE) {
    super(message);
    this.name = "CuratedIntakeIncompleteError";
  }
}

/** Thrown only for the closed "this intake has no workable routine" cases; its message is member-facing. */
export class CuratedNoSafePlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CuratedNoSafePlanError";
  }
}

export const CURATED_GENERATION_FALLBACK_MESSAGE =
  "The routine could not be generated from your setup. Edit your setup or build a routine manually.";

export type CuratedSafetyGate =
  | { status: "clear" }
  | { status: "unanswered"; missing: Array<"under18" | "warningSymptoms" | "safetyAcknowledgment"> }
  | { status: "guardian-permission-required" }
  | { status: "clearance-required"; symptoms: string[] };

/**
 * Free-text health answers that require a professional's clearance before any automatic routine. Matching is
 * deliberately conservative: it is a whole-word scan with no negation handling, so "no heart problems" also
 * blocks. A false block costs the member one tap ("Build manually"); a false pass would hand an automatic
 * routine to someone who named a cardiac, pregnancy, surgical or similar condition. Deterministic: the same
 * answers always give the same result, and the list lives only here.
 */
const MEDICAL_CLEARANCE_PATTERN = new RegExp(
  "\\b(" + [
    "heart", "cardiac", "cardio ?vascular", "arrhythmi\\w*", "afib", "angina", "murmur", "pacemaker",
    "hypertension", "blood pressure", "stroke", "aneurysm", "blood clot\\w*", "dvt",
    "pregnan\\w*", "postpartum", "post partum", "prenatal",
    "surger\\w*", "surgical", "post ?op\\w*", "operation",
    "fractur\\w*", "broken", "hernia\\w*", "osteoporo\\w*", "seizure\\w*", "epilep\\w*",
    "concussion\\w*", "marfan", "syncope", "faint\\w*", "diabet\\w*", "cancer", "chemo\\w*", "kidney",
  ].join("|") + ")\\b",
  "i",
);
const MEDICAL_CLEARANCE_ANSWER_KEYS = ["medicalConditions", "painDetails", "medicationConsiderations"] as const;

function findMedicalClearanceTerms(responses: Record<string, unknown>) {
  const found = new Set<string>();
  for (const key of MEDICAL_CLEARANCE_ANSWER_KEYS) {
    const value = responses[key];
    if (typeof value !== "string") continue;
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const match = MEDICAL_CLEARANCE_PATTERN.exec(normalized);
    if (match) found.add(`condition: ${match[1].trim()}`);
  }
  return [...found].sort();
}

/**
 * Fail-closed safety gate over the raw intake. Generation proceeds only when the member answered the
 * safety questions: `warningSymptoms` must be a non-empty string list, `safetyAcknowledgment` must be
 * `true`, and `under18` must be answered. Missing, empty or wrong-typed answers are `unanswered`, never
 * `clear`. A member under 18 needs a "yes" guardian permission. Any symptom other than "none" (including
 * "none" together with a symptom) requires clearance from a professional.
 */
export function evaluateCuratedSafetyGate(data: CuratedOnboardingData): CuratedSafetyGate {
  const responses = data.intakeResponses ?? {};
  const raw = responses.warningSymptoms;
  const missing: Array<"under18" | "warningSymptoms" | "safetyAcknowledgment"> = [];
  const symptomList = Array.isArray(raw) && raw.length > 0 && raw.every((value) => typeof value === "string")
    ? (raw as string[])
    : null;
  if (!symptomList) missing.push("warningSymptoms");
  if (responses.safetyAcknowledgment !== true) missing.push("safetyAcknowledgment");
  if (responses.under18 !== "yes" && responses.under18 !== "no") missing.push("under18");
  if (missing.length > 0) return { status: "unanswered", missing };

  if (responses.under18 === "yes" && responses.guardianPermission !== "yes") {
    return { status: "guardian-permission-required" };
  }

  const symptoms = [
    ...new Set((symptomList ?? []).filter((value) => value !== "none")),
    ...findMedicalClearanceTerms(responses),
  ].sort();
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
const STYLE_SPLITS: Partial<Record<PreferredStyle, Record<number, { reason: string; days: SplitDay[] }>>> = {
  "push-pull-legs": {
    3: {
      reason: "A push/pull/legs split matches your preferred style.",
      days: [
        { name: "Push", roles: ["horizontal-push", "vertical-push", "core", "cardio"] },
        { name: "Pull", roles: ["vertical-pull", "horizontal-pull", "hinge", "core"] },
        { name: "Legs", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
      ],
    },
  },
  "upper-lower": {
    2: {
      reason: "An upper/lower split matches your preferred style.",
      days: [
        { name: "Upper", roles: ["horizontal-push", "vertical-pull", "vertical-push", "horizontal-pull", "core"] },
        { name: "Lower", roles: ["squat", "hinge", "lunge", "core", "cardio"] },
      ],
    },
  },
};

const EQUIPMENT_LABELS: Record<EquipmentAccess, string> = {
  "full-gym": "a full gym",
  barbell: "a barbell",
  dumbbells: "dumbbells",
  machines: "machines",
  bands: "resistance bands",
  bodyweight: "bodyweight",
};

const GOAL_LABELS: Record<TrainingGoal, string> = {
  "build-muscle": "building muscle",
  "get-leaner": "getting leaner",
  "get-stronger": "getting stronger",
  "general-fitness": "general fitness",
};

function joinWithAnd(values: string[]) {
  if (values.length <= 1) return values.join("");
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

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
  // Conservative additions (FF-ENGINE-001): a named joint or region removes the roles that load it. A role
  // emptied this way is omitted from the day; a day left too thin fails closed instead of generating.
  { phrases: ["back pain", "back injur", "back issue", "back problem", "back strain", "back sprain", "back hurt", "backache", "spine", "spinal", "bulging disc", "slipped disc", "sciatic", "lumbar", "herniat", "scolio"], roles: ["squat", "hinge"] },
  { phrases: ["hip", "groin"], roles: ["squat", "hinge", "lunge"] },
  { phrases: ["ankle", "achilles", "foot", "feet", "shin", "calf", "plantar"], roles: ["squat", "lunge", "cardio"] },
  { phrases: ["elbow", "tennis", "golfer"], roles: ["horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull"] },
  { phrases: ["wrist", "carpal", "hand", "finger"], roles: ["horizontal-push", "vertical-push", "vertical-pull"] },
  { phrases: ["neck", "cervical"], roles: ["vertical-push", "vertical-pull"] },
  { phrases: ["rotator", "labrum", "collarbone", "clavicle", "ac joint", "pec tear"], roles: ["horizontal-push", "vertical-push", "vertical-pull"] },
  { phrases: ["hernia", "abdominal", "diastasis"], roles: ["core", "hinge"] },
  { phrases: ["hamstring", "quad", "pulled"], roles: ["hinge", "squat", "lunge"] },
];

/** A phrase matches at a word start ("knees", "shoulders") but never inside a word ("ship" is not "hip"). */
function limitationMentions(normalizedText: string, phrase: string) {
  return ` ${normalizedText}`.includes(` ${phrase}`);
}

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
      .filter(({ phrases }) => phrases.some((phrase) => limitationMentions(limitationText, phrase)))
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
    // One exercise never appears twice in the same day; a role whose only lift is already used is skipped.
    const unflagged = ranked.filter((candidate) => !softExcludedSlugs.has(candidate.slug));
    if (unflagged.length > 0) {
      return { exercise: unflagged.find((candidate) => !usedSlugs.has(candidate.slug)) ?? null, keptDespiteSignal: false };
    }
    // Session feedback marked every remaining lift for this role as too hard. Keep the first choice and say so.
    return { exercise: ranked.find((candidate) => !usedSlugs.has(candidate.slug)) ?? null, keptDespiteSignal: true };
  }
  if (available.length > 0) {
    if (available.some((candidate) => omittableSlugs.has(candidate.slug))) {
      return { exercise: null, keptDespiteSignal: false };
    }
    throw new CuratedNoSafePlanError(`No ${role.replace(/-/g, " ")} exercise fits your equipment and limits.`);
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
  if (safetyGate.status === "unanswered") {
    throw new CuratedIntakeIncompleteError();
  }
  if (safetyGate.status === "guardian-permission-required") {
    throw new CuratedPlanBlockedError("guardian-permission-required");
  }
  if (safetyGate.status === "clearance-required") {
    throw new CuratedPlanBlockedError("safety-clearance-required", safetyGate.symptoms);
  }

  if (!validateIntake(data)) {
    throw new CuratedIntakeIncompleteError();
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
  const failedSlugs = new Set(signals?.failedExerciseSlugs ?? []);
  const fatiguedSlugs = new Set(signals?.fatiguedExerciseSlugs ?? []);
  const painOrFormSlugs = new Set(signals?.painOrFormExerciseSlugs ?? []);
  const adaptiveExcludedSlugs = new Set([...failedSlugs, ...fatiguedSlugs]);
  const intakeConstraints = buildIntakeConstraintExclusions(data);
  const hardExcludedSlugs = new Set([
    ...intakeConstraints.excluded,
    ...intakeConstraints.equipmentExcluded,
    ...painOrFormSlugs,
  ]);
  // A role whose every compatible lift was removed by a stated limitation, by equipment the member asked to avoid
  // or by pain/form feedback is left out of the day. A role emptied only by dislikes still fails closed.
  const omittableSlugs = new Set([
    ...intakeConstraints.limitationExcluded,
    ...intakeConstraints.equipmentExcluded,
    ...painOrFormSlugs,
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
    const selections: Array<{ role: MovementRole; exercise: ExerciseCandidate }> = [];
    const baselineSelections: ExerciseCandidate[] = [];
    const roleAdjustments: CuratedPlanAdjustment[] = [];
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
      if (baseline) {
        baselineUsedSlugs.add(baseline.slug);
        baselineSelections.push(baseline);
      }
      const exercise = choice.exercise;
      if (exercise) {
        usedSlugs.add(exercise.slug);
        selections.push({ role, exercise });
      }

      if (baseline && (!exercise || baseline.slug !== exercise.slug)) {
        const painOrForm = painOrFormSlugs.has(baseline.slug);
        const cause = painOrForm
          ? "pain-or-form" as const
          : failedSlugs.has(baseline.slug)
            ? "failed-target" as const
            : fatiguedSlugs.has(baseline.slug)
              ? "fatigue" as const
              : intakeConstraints.equipmentExcluded.has(baseline.slug)
                ? "avoided-equipment" as const
                : null;
        if (cause && exercise) {
          roleAdjustments.push({
            kind: "exercise-swapped",
            dayName: day.name,
            from: baseline.name,
            to: exercise.name,
            cause,
            reason: cause === "pain-or-form"
              ? `Recent session feedback marked ${baseline.name} as a form breakdown or pain, so ${exercise.name} replaces it on ${day.name}.`
              : cause === "failed-target"
                ? `Recent session feedback marked ${baseline.name} as too hard, so ${exercise.name} replaces it on ${day.name}.`
                : cause === "fatigue"
                  ? `Recent session feedback marked ${baseline.name} as too hard or a bad day, so ${exercise.name} replaces it on ${day.name}.`
                  : `You asked to avoid the equipment ${baseline.name} needs, so ${exercise.name} replaces it on ${day.name}.`,
          });
        } else if (cause === "pain-or-form" && !exercise) {
          roleAdjustments.push({
            kind: "exercise-omitted",
            dayName: day.name,
            exercise: baseline.name,
            cause: "pain-or-form",
            reason: `Recent session feedback marked ${baseline.name} as a form breakdown or pain and no other exercise fits your equipment, so it is left out of ${day.name}.`,
          });
        }
      } else if (baseline && exercise && choice.keptDespiteSignal) {
        roleAdjustments.push({
          kind: "exercise-kept",
          dayName: day.name,
          exercise: exercise.name,
          reason: `Recent session feedback marked ${exercise.name} as too hard, but no other exercise fits your equipment, so it stays on ${day.name}. Edit it after creating the routine if it is still a problem.`,
        });
      }
    }

    const kept = selections.slice(0, exerciseLimit);
    const keptSlugs = new Set(kept.map(({ exercise }) => exercise.slug));
    const baselineSlice = baselineSelections.slice(0, exerciseLimit);
    const baselineSliceNames = new Set(baselineSlice.map((exercise) => exercise.name));
    const keptNames = new Set(kept.map(({ exercise }) => exercise.name));

    // Role-level reasons, restricted to what actually appears in (or is missing from) the final day.
    const explained = roleAdjustments.filter((adjustment) => {
      if (adjustment.kind === "exercise-swapped") return keptNames.has(adjustment.to) && baselineSliceNames.has(adjustment.from);
      if (adjustment.kind === "exercise-omitted") return baselineSliceNames.has(adjustment.exercise);
      if (adjustment.kind === "exercise-kept") return keptNames.has(adjustment.exercise);
      return false;
    });
    const explainedRemoved = new Set(explained.flatMap((adjustment) => {
      if (adjustment.kind === "exercise-swapped") return [adjustment.from];
      if (adjustment.kind === "exercise-omitted") return [adjustment.exercise];
      return [];
    }));
    const explainedAdded = new Set(explained.flatMap((adjustment) => (
      adjustment.kind === "exercise-swapped" ? [adjustment.to] : []
    )));

    // Whatever else differs from the first-choice day (a cascade from de-duplication, the exercise limit or an
    // omitted role) is still named, so no difference between this day and its first choice goes unexplained.
    const removed = baselineSlice
      .filter((exercise) => !keptSlugs.has(exercise.slug) && !explainedRemoved.has(exercise.name))
      .map((exercise) => exercise.name);
    const baselineSliceSlugs = new Set(baselineSlice.map((exercise) => exercise.slug));
    const added = kept
      .filter(({ exercise }) => !baselineSliceSlugs.has(exercise.slug) && !explainedAdded.has(exercise.name))
      .map(({ exercise }) => exercise.name);
    const cascade: CuratedPlanAdjustment[] = [];
    if (removed.length > 0 || added.length > 0) {
      cascade.push({
        kind: "day-adjusted",
        dayName: day.name,
        removed,
        added,
        reason: removed.length > 0 && added.length > 0
          ? `After the changes above, ${joinWithAnd(removed)} no longer ${removed.length === 1 ? "fits" : "fit"} ${day.name}, so ${joinWithAnd(added)} takes its place.`
          : removed.length > 0
            ? `After the changes above, ${joinWithAnd(removed)} ${removed.length === 1 ? "was" : "were"} dropped from ${day.name}.`
            : `After the changes above, ${joinWithAnd(added)} ${added.length === 1 ? "was" : "were"} added to ${day.name}.`,
      });
    } else if (
      baselineSlice.length === kept.length
      && baselineSlice.some((exercise, index) => exercise.slug !== kept[index].exercise.slug)
      && explained.length === 0
    ) {
      cascade.push({
        kind: "day-adjusted",
        dayName: day.name,
        removed: [],
        added: [],
        reason: `${day.name} keeps the same exercises in a different order after the changes above.`,
      });
    }

    return {
      name: day.name,
      adjustments: [...explained, ...cascade],
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
    throw new CuratedNoSafePlanError(
      `No exercises remain for ${emptyDay.name}. Adjust your equipment or limitations, then generate the routine again.`,
    );
  }
  const thinDay = days.find((day) => day.exercises.length < MIN_EXERCISES_PER_DAY);
  if (thinDay) {
    throw new CuratedNoSafePlanError(
      `Too few exercises remain for ${thinDay.name} (${thinDay.exercises.length} of ${MIN_EXERCISES_PER_DAY} needed). Adjust your equipment or limitations, then generate the routine again.`,
    );
  }
  const nameByGoal: Record<TrainingGoal, string> = {
    "build-muscle": "Atlas Muscle",
    "get-leaner": "Atlas Lean",
    "get-stronger": "Atlas Strength",
    "general-fitness": "Atlas Fitness",
  };
  const sortedEquipment = [...equipment].sort();
  // The plan id identifies the OUTPUT the member reviews and saves (name, schedule, exercises, targets), so an
  // input that does not change the routine never produces a different id or a false "plan changed".
  const planDigest = JSON.stringify({
    name: nameByGoal[goal],
    daysPerWeek,
    sessionLengthMinutes,
    days: days.map((day) => [
      day.name,
      day.exercises.map((exercise) => [
        exercise.slug,
        exercise.measurementType,
        exercise.targetSets,
        exercise.targetRepsMin,
        exercise.targetRepsMax,
        exercise.targetDurationSeconds ?? null,
      ]),
    ]),
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
  const omittedCount = new Set(
    adjustments.flatMap((adjustment) => (adjustment.kind === "exercise-omitted" ? [adjustment.exercise] : [])),
  ).size;
  const adaptiveRationale = [
    ...(signals && signals.completionRate !== null
      ? [`Based on your last 28 days: ${Math.round(signals.completionRate * 100)}% of planned workouts completed.`]
      : []),
    ...(shouldReduceSchedule ? [scheduleReason] : []),
    ...(historyReplacedCount > 0
      ? [`Recent session feedback replaced ${historyReplacedCount} exercise choice${historyReplacedCount === 1 ? "" : "s"} where an equipment-compatible alternative existed.`]
      : []),
    ...(omittedCount > 0
      ? [`Recent session feedback left out ${omittedCount} exercise${omittedCount === 1 ? "" : "s"} marked as a form breakdown or pain because no equipment-compatible alternative existed.`]
      : []),
    ...(intakeConstraints.excluded.size > 0
      ? [`Your stated limitations or exercise exclusions removed ${intakeConstraints.excluded.size} exercise choice${intakeConstraints.excluded.size === 1 ? "" : "s"}.`]
      : []),
    ...(avoidedEquipmentExclusionCount > 0
      ? [`Equipment you asked to avoid removed ${avoidedEquipmentExclusionCount} exercise choice${avoidedEquipmentExclusionCount === 1 ? "" : "s"}.`]
      : []),
    ...(styleSplit
      ? [styleSplit.reason]
      : []),
    ...(preferences.exerciseLikes.length > 0 || preferences.targetTokens.size > 0
      ? ["Your preferred exercises and target areas shape the order of equipment-compatible choices."]
      : []),
  ];

  return {
    version: 1,
    planId: `curated-${hashPlan(planDigest)}`,
    name: nameByGoal[goal],
    rationale: [
      `${daysPerWeek} workout days sized for ${sessionLengthMinutes}-minute sessions.`,
      `Exercises are chosen from ${joinWithAnd(sortedEquipment.map((value) => EQUIPMENT_LABELS[value]))}.`,
      `Sets and reps are set for ${GOAL_LABELS[goal]} at the ${data.experience} level, and every exercise uses double progression.`,
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
    if (error instanceof CuratedIntakeIncompleteError) {
      return { status: "failed", reason: "incomplete-intake", message: error.message };
    }
    if (error instanceof CuratedNoSafePlanError) {
      return { status: "failed", reason: "no-safe-plan", message: error.message };
    }
    // Anything else is a bug, not a member problem: never show raw exception text.
    return { status: "failed", reason: "no-safe-plan", message: CURATED_GENERATION_FALLBACK_MESSAGE };
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
