import { CURATED_ONBOARDING_DRAFT_VERSION } from "./constants.ts";
import { getArrayResponse, getStringResponse } from "./questionnaire.ts";
import type {
  CardioPreference,
  CuratedIntakeResponses,
  CuratedOnboardingData,
  EquipmentAccess,
  ExperienceLevel,
  PreferredStyle,
  TrainingGoal,
} from "./types.ts";

export const CURATED_PLANNING_CONTRACT_VERSION = 1 as const;
export const CURATED_PLANNING_SCHEMA = "fawxzzy-fitness.curated-planning.v1" as const;
export const CURATED_PLANNING_ALGORITHM_VERSION = "curated-planning-v1" as const;

export type CuratedWeekdayIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CuratedPlanningBlockerCode =
  | "guardian-authorization-required"
  | "medical-context-requires-review"
  | "medication-context-requires-review"
  | "pain-details-required"
  | "preferred-weekday-count-mismatch"
  | "preferred-weekday-selection-ambiguous"
  | "professional-restrictions-required"
  | "safety-acknowledgment-required"
  | "safety-answers-incomplete"
  | "unsupported-preferred-weekday"
  | "warning-symptoms-contradictory"
  | "warning-symptoms-require-clearance";

export type CuratedPlanningContract = {
  schema: typeof CURATED_PLANNING_SCHEMA;
  version: typeof CURATED_PLANNING_CONTRACT_VERSION;
  algorithmVersion: typeof CURATED_PLANNING_ALGORITHM_VERSION;
  status: "ready" | "blocked";
  blockerCodes: CuratedPlanningBlockerCode[];
  goals: {
    primary: TrainingGoal | null;
    ordered: string[];
    targetAreas: string[];
    movementsToImprove: string[];
    struggles: string[];
  };
  experience: {
    level: ExperienceLevel | null;
    currentRoutine: string | null;
    currentSplit: string | null;
    trackingStatus: string | null;
    mainLiftContext: string | null;
  };
  schedule: {
    daysPerWeek: number | null;
    sessionLengthMinutes: number | null;
    weeklyMinutes: number | null;
    mode: "exact-weekdays" | "flexible";
    preferredWeekdayIndexes: CuratedWeekdayIndex[];
    trainingTime: string | null;
    outsideActivity: string | null;
    sleepHours: string | null;
  };
  equipment: {
    access: EquipmentAccess[];
    locations: string[];
    available: string[];
    avoid: string[];
    heaviestDumbbells: string | null;
  };
  safety: {
    status: "ready" | "blocked";
    blockerCodes: CuratedPlanningBlockerCode[];
    limitations: string[];
    excludedMovements: string[];
    uncomfortableMovements: string[];
    warningSymptoms: string[];
  };
  preferences: {
    style: PreferredStyle | null;
    cardio: CardioPreference | null;
    cardioSessionsPerWeek: number;
    exerciseLikes: string[];
    exerciseDislikes: string[];
    equipmentPreference: string | null;
  };
  context: {
    nutrition: {
      direction: string | null;
      requestedHelp: string[];
      foodRestrictions: string[];
    };
    delivery: {
      requestedContents: string[];
      detail: string | null;
      method: string | null;
    };
  };
  provenance: {
    sourceDraftVersion: typeof CURATED_ONBOARDING_DRAFT_VERSION;
    digestAlgorithm: "sha256";
    digest: string;
  };
};

const WEEKDAY_INDEX_BY_VALUE: Record<string, CuratedWeekdayIndex> = {
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};

const EQUIPMENT_ACCESS_ORDER: EquipmentAccess[] = [
  "full-gym",
  "barbell",
  "dumbbells",
  "machines",
  "bands",
  "bodyweight",
];

const ABSENCE_VALUES = new Set([
  "",
  "n/a",
  "na",
  "none",
  "no",
  "not applicable",
  "not available",
]);

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeOptionalText(value: string) {
  const normalized = normalizeText(value);
  return ABSENCE_VALUES.has(normalized) ? null : normalized;
}

function splitTextList(value: string) {
  const normalizedValue = normalizeOptionalText(value);
  if (!normalizedValue) return [];
  return normalizedValue
    .split(/\r?\n|,|;/)
    .map(normalizeText)
    .filter((item) => !ABSENCE_VALUES.has(item));
}

function unique(
  values: string[],
  options: { preserveAbsenceValues?: boolean; sort?: boolean } = {},
) {
  const result = [...new Set(
    values
      .map(normalizeText)
      .filter((value) => value && (options.preserveAbsenceValues || !ABSENCE_VALUES.has(value))),
  )];
  return options.sort ? result.sort() : result;
}

function readSingleResponse(responses: CuratedIntakeResponses, questionId: string) {
  const selected = getStringResponse(responses, questionId);
  const resolved = selected === "other"
    ? getStringResponse(responses, `${questionId}Other`)
    : selected;
  return normalizeOptionalText(resolved);
}

function readMultiResponse(
  responses: CuratedIntakeResponses,
  questionId: string,
  options: { preserveAbsenceValues?: boolean } = {},
) {
  const selected = getArrayResponse(responses, questionId);
  const resolved = selected.flatMap((value) => (
    value === "other"
      ? splitTextList(getStringResponse(responses, `${questionId}Other`))
      : [value]
  ));
  return unique(resolved, { ...options, sort: true });
}

function isPresent(responses: CuratedIntakeResponses, questionId: string) {
  return Object.prototype.hasOwnProperty.call(responses, questionId);
}

function derivePreciseEquipmentAccess(
  data: CuratedOnboardingData,
  available: string[],
) {
  if (available.length === 0) {
    return EQUIPMENT_ACCESS_ORDER.filter((value) => data.equipment.includes(value));
  }

  const selected = new Set<EquipmentAccess>();
  if (available.includes("barbells")) {
    selected.add("barbell");
  }
  if (available.some((value) => ["dumbbells", "kettlebells"].includes(value))) {
    selected.add("dumbbells");
  }
  if (available.some((value) => ["smith-machine", "cables", "machines", "treadmill", "bike"].includes(value))) {
    selected.add("machines");
  }
  if (available.includes("resistance-bands")) {
    selected.add("bands");
  }
  if (available.some((value) => ["bodyweight", "pull-up-bar"].includes(value))) {
    selected.add("bodyweight");
  }

  return EQUIPMENT_ACCESS_ORDER.filter((value) => selected.has(value));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function rotateRight(value: number, shift: number) {
  return (value >>> shift) | (value << (32 - shift));
}

export function sha256Hex(value: string) {
  const source = new TextEncoder().encode(value);
  const byteLength = source.length;
  const paddedLength = Math.ceil((byteLength + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(source);
  padded[byteLength] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(byteLength / 0x20000000), false);
  view.setUint32(paddedLength - 4, (byteLength * 8) >>> 0, false);

  const state = new Uint32Array([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const upperSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + upperSigma1 + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const upperSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (upperSigma0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return Array.from(state)
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

export function normalizeCuratedPlanningContract(
  data: CuratedOnboardingData,
): CuratedPlanningContract {
  const responses = data.intakeResponses;
  const planningBlockers = new Set<CuratedPlanningBlockerCode>();
  const safetyBlockers = new Set<CuratedPlanningBlockerCode>();

  const preferredDays = readMultiResponse(responses, "preferredTrainingDays");
  const flexibleSelected = preferredDays.includes("flexible");
  const unsupportedPreferredDays = preferredDays.filter(
    (value) => value !== "flexible" && !WEEKDAY_INDEX_BY_VALUE[value],
  );
  const preferredWeekdayIndexes = [...new Set(
    preferredDays.flatMap((value) => WEEKDAY_INDEX_BY_VALUE[value] ?? []),
  )].sort((left, right) => left - right);

  if (unsupportedPreferredDays.length > 0) {
    planningBlockers.add("unsupported-preferred-weekday");
  }
  if (flexibleSelected && preferredWeekdayIndexes.length > 0) {
    planningBlockers.add("preferred-weekday-selection-ambiguous");
  }
  if (
    !flexibleSelected
    && preferredWeekdayIndexes.length > 0
    && data.daysPerWeek
    && preferredWeekdayIndexes.length !== data.daysPerWeek
  ) {
    planningBlockers.add("preferred-weekday-count-mismatch");
  }

  const under18 = readSingleResponse(responses, "under18");
  const hasQuestionnaireIntake = Object.keys(responses).length > 0;
  if (
    hasQuestionnaireIntake
    && [
      "under18",
      "hasPainOrLimitations",
      "professionalRestrictions",
      "warningSymptoms",
      "medications",
    ].some((questionId) => !isPresent(responses, questionId))
  ) {
    safetyBlockers.add("safety-answers-incomplete");
  }
  if (under18 === "yes" && readSingleResponse(responses, "guardianPermission") !== "yes") {
    safetyBlockers.add("guardian-authorization-required");
  }

  const hasPainOrLimitations = readSingleResponse(responses, "hasPainOrLimitations");
  const painDetails = splitTextList(getStringResponse(responses, "painDetails"));
  if (hasPainOrLimitations === "yes" && painDetails.length === 0) {
    safetyBlockers.add("pain-details-required");
  }

  const professionalRestrictions = readSingleResponse(responses, "professionalRestrictions");
  const restrictedMovements = splitTextList(getStringResponse(responses, "restrictedMovements"));
  if (professionalRestrictions === "yes" && restrictedMovements.length === 0) {
    safetyBlockers.add("professional-restrictions-required");
  }

  const warningSymptoms = readMultiResponse(
    responses,
    "warningSymptoms",
    { preserveAbsenceValues: true },
  );
  const activeWarningSymptoms = warningSymptoms.filter((value) => value !== "none");
  if (warningSymptoms.includes("none") && activeWarningSymptoms.length > 0) {
    safetyBlockers.add("warning-symptoms-contradictory");
  }
  if (activeWarningSymptoms.length > 0) {
    safetyBlockers.add("warning-symptoms-require-clearance");
  }

  const medicalConditions = splitTextList(getStringResponse(responses, "medicalConditions"));
  if (medicalConditions.length > 0) {
    safetyBlockers.add("medical-context-requires-review");
  }

  const medications = readSingleResponse(responses, "medications");
  if (medications === "yes" || medications === "prefer-not-to-say") {
    safetyBlockers.add("medication-context-requires-review");
  }

  if (hasQuestionnaireIntake && responses.safetyAcknowledgment !== true) {
    safetyBlockers.add("safety-acknowledgment-required");
  }
  if (hasQuestionnaireIntake && responses.fitnessGuidanceAcknowledgment !== true) {
    safetyBlockers.add("safety-acknowledgment-required");
  }

  for (const blocker of safetyBlockers) {
    planningBlockers.add(blocker);
  }

  const locations = readMultiResponse(responses, "trainingLocations");
  const availableEquipment = readMultiResponse(responses, "availableEquipment");
  const equipmentAccess = derivePreciseEquipmentAccess(data, availableEquipment);
  const exerciseCannotDo = splitTextList(getStringResponse(responses, "exercisesCannotDo"));
  const uncomfortableMovements = splitTextList(getStringResponse(responses, "uncomfortableExercises"));
  const exerciseLikes = unique([
    ...data.exerciseLikes,
    ...splitTextList(getStringResponse(responses, "exerciseEnjoy")),
  ], { sort: true });
  const exerciseDislikes = unique([
    ...data.exerciseDislikes,
    ...splitTextList(getStringResponse(responses, "exerciseHate")),
    ...exerciseCannotDo,
    ...uncomfortableMovements,
  ], { sort: true });
  const limitations = unique([
    ...splitTextList(data.limitations ?? ""),
    ...painDetails,
    ...restrictedMovements,
    ...exerciseCannotDo,
    ...uncomfortableMovements,
  ], { sort: true });

  const primaryGoal = data.trainingGoal ?? null;
  const orderedGoals = unique([
    ...(primaryGoal ? [primaryGoal] : []),
    ...readMultiResponse(responses, "mainGoals"),
    ...splitTextList(getStringResponse(responses, "topThreeGoals")),
  ]);
  const targetAreas = unique([
    ...data.targetAreas,
    ...readMultiResponse(responses, "areasToImprove"),
  ], { sort: true });
  const movementsToImprove = readMultiResponse(responses, "movementsToImprove");
  const daysPerWeek = data.daysPerWeek ?? null;
  const sessionLengthMinutes = data.sessionLengthMinutes ?? null;
  const scheduleMode: CuratedPlanningContract["schedule"]["mode"] = (
    !flexibleSelected
    && preferredWeekdayIndexes.length > 0
    && preferredWeekdayIndexes.length === daysPerWeek
  ) ? "exact-weekdays" : "flexible";
  const cardioSessionsPerWeek = data.cardioPreference === "focus"
    ? Math.min(daysPerWeek ?? 1, 3)
    : data.cardioPreference === "balanced"
      ? 1
      : 0;

  const contractWithoutProvenance = {
    schema: CURATED_PLANNING_SCHEMA,
    version: CURATED_PLANNING_CONTRACT_VERSION,
    algorithmVersion: CURATED_PLANNING_ALGORITHM_VERSION,
    status: planningBlockers.size > 0 ? "blocked" as const : "ready" as const,
    blockerCodes: [...planningBlockers].sort(),
    goals: {
      primary: primaryGoal,
      ordered: orderedGoals,
      targetAreas,
      movementsToImprove,
      struggles: readMultiResponse(responses, "biggestStruggles"),
    },
    experience: {
      level: data.experience ?? null,
      currentRoutine: normalizeOptionalText(getStringResponse(responses, "currentRoutine")),
      currentSplit: normalizeOptionalText(getStringResponse(responses, "currentSplit")),
      trackingStatus: readSingleResponse(responses, "tracksWorkouts"),
      mainLiftContext: normalizeOptionalText(getStringResponse(responses, "mainLiftNumbers")),
    },
    schedule: {
      daysPerWeek,
      sessionLengthMinutes,
      weeklyMinutes: daysPerWeek && sessionLengthMinutes
        ? daysPerWeek * sessionLengthMinutes
        : null,
      mode: scheduleMode,
      preferredWeekdayIndexes,
      trainingTime: readSingleResponse(responses, "trainingTime"),
      outsideActivity: readSingleResponse(responses, "outsideActivity"),
      sleepHours: readSingleResponse(responses, "sleepHours"),
    },
    equipment: {
      access: equipmentAccess,
      locations,
      available: availableEquipment,
      avoid: unique(splitTextList(getStringResponse(responses, "equipmentAvoid")), { sort: true }),
      heaviestDumbbells: normalizeOptionalText(getStringResponse(responses, "heaviestDumbbells")),
    },
    safety: {
      status: safetyBlockers.size > 0 ? "blocked" as const : "ready" as const,
      blockerCodes: [...safetyBlockers].sort(),
      limitations,
      excludedMovements: unique([...exerciseCannotDo, ...restrictedMovements]),
      uncomfortableMovements,
      warningSymptoms: activeWarningSymptoms,
    },
    preferences: {
      style: data.preferredStyle ?? null,
      cardio: data.cardioPreference ?? null,
      cardioSessionsPerWeek,
      exerciseLikes,
      exerciseDislikes,
      equipmentPreference: readSingleResponse(responses, "equipmentPreference"),
    },
    context: {
      nutrition: {
        direction: readSingleResponse(responses, "nutritionDirection"),
        requestedHelp: readMultiResponse(responses, "nutritionHelp"),
        foodRestrictions: unique(splitTextList(getStringResponse(responses, "foodRestrictions")), { sort: true }),
      },
      delivery: {
        requestedContents: readMultiResponse(responses, "planContents"),
        detail: readSingleResponse(responses, "planDetail"),
        method: readSingleResponse(responses, "deliveryMethod"),
      },
    },
  };

  return {
    ...contractWithoutProvenance,
    provenance: {
      sourceDraftVersion: CURATED_ONBOARDING_DRAFT_VERSION,
      digestAlgorithm: "sha256",
      digest: sha256Hex(stableSerialize(contractWithoutProvenance)),
    },
  };
}
