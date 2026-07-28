import {
  CURATED_QUESTIONS,
  getArrayResponse,
  getStringResponse,
  hasCuratedQuestionResponse,
  isCuratedQuestionVisible,
  removeHiddenCuratedResponses,
} from "../questionnaire.ts";
import type {
  CuratedIntakeResponses,
  CuratedOnboardingData,
  CuratedQuestionDefinition,
} from "../types.ts";
import { canonicalizeJson, digestCanonicalJson } from "./canonical.ts";
import {
  CURATED_INTAKE_CONTRACT_VERSION,
  CURATED_NORMALIZER_VERSION,
  CURATED_RESPONSE_PATH_BY_QUESTION_ID,
  NORMALIZED_PLANNING_INTAKE_VERSION,
  type GoalCode,
  type JsonPointer,
  type NormalizationIssue,
  type NormalizationIssueCode,
  type NormalizedPlanningIntakeV1,
  type ProvenanceEntry,
  type RankedValue,
  type RestrictionCode,
  type Weekday,
} from "./contract.ts";
import { digestPlanningGenerationProjection } from "./projection.ts";

const ABSENCE_VALUES = new Set([
  "",
  "n/a",
  "n.a.",
  "na",
  "none",
  "no",
  "not applicable",
  "not available",
  "unknown",
]);

const UNORDERED_TEXT_QUESTION_IDS = new Set([
  "equipmentAvoid",
  "exercisesCannotDo",
  "uncomfortableExercises",
  "exerciseEnjoy",
  "exerciseHate",
  "foodRestrictions",
]);

const WEEKDAY_BY_ANSWER: Record<string, Weekday> = {
  mon: "monday",
  monday: "monday",
  tue: "tuesday",
  tues: "tuesday",
  tuesday: "tuesday",
  wed: "wednesday",
  wednesday: "wednesday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  thursday: "thursday",
  fri: "friday",
  friday: "friday",
  sat: "saturday",
  saturday: "saturday",
  sun: "sunday",
  sunday: "sunday",
};

const WEEKDAY_ORDER: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const RESTRICTION_RULES: Array<{ code: RestrictionCode; pattern: RegExp }> = [
  { code: "NO_OVERHEAD_LOADING", pattern: /\b(?:overhead|vertical press|shoulder press)\b/i },
  { code: "NO_HIGH_IMPACT", pattern: /\b(?:high impact|jump|running|run)\b/i },
  { code: "NO_DEEP_KNEE_FLEXION", pattern: /\b(?:deep knee|deep squat|knee flexion)\b/i },
  { code: "NO_LOADED_SPINAL_FLEXION", pattern: /\b(?:loaded spinal flexion|spinal flexion)\b/i },
  { code: "NO_UNSUPPORTED_HINGE", pattern: /\b(?:unsupported hinge|unsupported row)\b/i },
  { code: "NO_SINGLE_LEG_BALANCE", pattern: /\b(?:single leg|single-leg|balance)\b/i },
  { code: "NO_PRONE_POSITION", pattern: /\b(?:prone|face down)\b/i },
  { code: "NO_WEIGHT_BEARING_WRIST_EXTENSION", pattern: /\b(?:wrist extension|weight bearing wrist)\b/i },
  { code: "NO_AXIAL_LOADING", pattern: /\b(?:axial load|bar on (?:the )?back)\b/i },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeIdentifier(value: string) {
  return normalizeText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalText(value: string) {
  const normalized = normalizeText(value);
  return ABSENCE_VALUES.has(normalized) ? null : normalized;
}

function splitRankedText(value: string) {
  const trimmed = value.trim();
  if (!trimmed || ABSENCE_VALUES.has(normalizeText(trimmed))) return [];
  return trimmed
    .split(/\r?\n|,|;/)
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry && !ABSENCE_VALUES.has(entry));
}

function splitText(value: string) {
  return uniqueSorted(splitRankedText(value));
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort();
}

function uniqueSortedExact<T extends string>(values: T[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function readSingle(responses: CuratedIntakeResponses, questionId: string) {
  const selected = getStringResponse(responses, questionId);
  return selected === "other"
    ? normalizeOptionalText(getStringResponse(responses, `${questionId}Other`))
    : normalizeText(selected) || null;
}

function readMulti(responses: CuratedIntakeResponses, questionId: string) {
  return uniqueSorted(
    getArrayResponse(responses, questionId).flatMap((value) => (
      value === "other"
        ? splitText(getStringResponse(responses, `${questionId}Other`))
        : [value]
    )),
  );
}

function responsePath(questionId: string): JsonPointer {
  const path = CURATED_RESPONSE_PATH_BY_QUESTION_ID[
    questionId as keyof typeof CURATED_RESPONSE_PATH_BY_QUESTION_ID
  ];
  if (!path) {
    throw new Error(`Missing governed planning response path for ${questionId}.`);
  }
  return path;
}

function makeIssue(
  code: NormalizationIssueCode,
  severity: NormalizationIssue["severity"],
  fieldPath: JsonPointer,
  sourceQuestionIds: string[],
  messageArguments: Record<string, string | number> = {},
): NormalizationIssue {
  return {
    code,
    severity,
    fieldPath,
    sourceQuestionIds: [...sourceQuestionIds].sort(),
    messageArguments,
  };
}

function responseValidationCode(
  question: CuratedQuestionDefinition,
  responses: CuratedIntakeResponses,
): "INVALID_RESPONSE_TYPE" | "INVALID_OPTION" | null {
  const response = responses[question.id];
  if (response === undefined) return null;
  if (question.type === "acknowledgment") {
    return typeof response === "boolean" ? null : "INVALID_RESPONSE_TYPE";
  }
  if (question.type === "multi") {
    if (!Array.isArray(response) || response.some((entry) => typeof entry !== "string")) {
      return "INVALID_RESPONSE_TYPE";
    }
    const allowed = new Set(question.options?.map((option) => option.value) ?? []);
    return response.every((entry) => entry === "other"
      ? Boolean(question.allowOther)
      : allowed.size === 0 || allowed.has(entry))
      ? null
      : "INVALID_OPTION";
  }
  if (typeof response !== "string") return "INVALID_RESPONSE_TYPE";
  if (!question.options) return null;
  return (response === "other"
    ? Boolean(question.allowOther)
    : question.options.some((option) => option.value === response))
    ? null
    : "INVALID_OPTION";
}

function validateResponses(responses: CuratedIntakeResponses) {
  const issues: NormalizationIssue[] = [];

  for (const question of CURATED_QUESTIONS) {
    if (!isCuratedQuestionVisible(question, responses)) continue;
    const fieldPath = responsePath(question.id);
    const safety = fieldPath.startsWith("/safety/");
    if (question.required && !hasCuratedQuestionResponse(question, responses)) {
      issues.push(makeIssue(
        "MISSING_REQUIRED_VALUE",
        "blocking",
        fieldPath,
        [question.id],
      ));
    }
    const validationCode = responseValidationCode(question, responses);
    if (validationCode) {
      issues.push(makeIssue(
        safety ? "AMBIGUOUS_SAFETY_RESPONSE" : validationCode,
        "blocking",
        fieldPath,
        [question.id],
      ));
      continue;
    }

    const response = responses[question.id];
    const selectedOther = response === "other" || (Array.isArray(response) && response.includes("other"));
    if (selectedOther && !getStringResponse(responses, `${question.id}Other`).trim()) {
      issues.push(makeIssue(
        safety ? "AMBIGUOUS_SAFETY_RESPONSE" : "UNRESOLVED_OTHER_VALUE",
        "blocking",
        fieldPath,
        [question.id, `${question.id}Other`],
      ));
    } else if (selectedOther && safety) {
      issues.push(makeIssue(
        "AMBIGUOUS_SAFETY_RESPONSE",
        "blocking",
        fieldPath,
        [question.id, `${question.id}Other`],
      ));
    }
  }

  return issues;
}

function canonicalRawResponses(responses: CuratedIntakeResponses) {
  const canonical: Record<string, string | string[] | boolean> = {};
  for (const question of CURATED_QUESTIONS) {
    const value = responses[question.id];
    if (typeof value === "boolean") canonical[question.id] = value;
    else if (typeof value === "string") {
      canonical[question.id] = question.id === "topThreeGoals"
        ? splitRankedText(value).join("\n")
        : UNORDERED_TEXT_QUESTION_IDS.has(question.id)
          ? splitText(value).join("\n")
          : value.trim();
    }
    else if (Array.isArray(value)) canonical[question.id] = uniqueSorted(value);

    const otherKey = `${question.id}Other`;
    const otherValue = responses[otherKey];
    if (typeof otherValue === "string" && otherValue.trim()) {
      canonical[otherKey] = question.type === "multi"
        ? splitText(otherValue).join("\n")
        : otherValue.trim();
    }
  }
  return canonical;
}

function parseBoundedInteger(responses: CuratedIntakeResponses, questionId: string, minimum: number, maximum: number) {
  const selected = getStringResponse(responses, questionId);
  const value = selected === "other"
    ? getStringResponse(responses, `${questionId}Other`)
    : selected;
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function deriveSessionMinutes(responses: CuratedIntakeResponses) {
  const selected = getStringResponse(responses, "workoutLength");
  const byAnswer: Record<string, number> = {
    "20-30": 30,
    "30-45": 45,
    "45-60": 60,
    "60-90": 90,
    "90-plus": 90,
  };
  return selected === "other"
    ? parseBoundedInteger(responses, "workoutLength", 10, 180)
    : byAnswer[selected] ?? null;
}

function derivePrimaryGoal(responses: CuratedIntakeResponses): GoalCode | null {
  const primary = normalizeText(getStringResponse(responses, "primaryGoal"));
  if (primary.includes("strong")) return "get_stronger";
  if (primary.includes("muscle") || primary.includes("mass")) return "build_muscle";
  if (primary.includes("lean") || primary.includes("fat") || primary.includes("weight loss")) return "get_leaner";
  if (primary.includes("athletic") || primary.includes("conditioning")) return "athleticism";
  if (primary) return normalizeIdentifier(primary).replace(/-/g, "_");

  const goals = readMulti(responses, "mainGoals");
  const first = goals[0];
  if (!first) return null;
  return normalizeIdentifier(first).replace(/-/g, "_");
}

function deriveSecondaryGoals(responses: CuratedIntakeResponses, primary: GoalCode | null) {
  const lines = splitRankedText(getStringResponse(responses, "topThreeGoals"));
  return lines
    .map((value) => normalizeIdentifier(value).replace(/-/g, "_"))
    .filter((value) => value && value !== primary)
    .map((value, index) => ({
      value,
      rank: index + 1,
      ranking: "explicit" as const,
    }));
}

function canonicalRankedValues(values: string[]): RankedValue[] {
  return uniqueSorted(values).map((value, index) => ({
    value: normalizeIdentifier(value),
    rank: index + 1,
    ranking: "canonical_unranked",
  }));
}

function deriveExperience(responses: CuratedIntakeResponses) {
  const value = getStringResponse(responses, "trainingExperience");
  if (["brand-new", "under-3-months"].includes(value)) return "beginner" as const;
  if (value === "2-plus-years") return "advanced" as const;
  if (value) return "intermediate" as const;
  return null;
}

function deriveTrackingExperience(responses: CuratedIntakeResponses) {
  const value = getStringResponse(responses, "tracksWorkouts");
  if (value === "yes") return "structured" as const;
  if (value === "sometimes") return "informal" as const;
  if (value === "no") return "none" as const;
  return "unknown" as const;
}

function deriveEquipment(responses: CuratedIntakeResponses) {
  return readMulti(responses, "availableEquipment")
    .map(normalizeIdentifier)
    .filter(Boolean)
    .sort();
}

function deriveEquipmentAvoided(responses: CuratedIntakeResponses) {
  return splitText(getStringResponse(responses, "equipmentAvoid"))
    .map(normalizeIdentifier)
    .filter(Boolean)
    .sort();
}

function parseDumbbellLoadKg(value: string) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const kg = /\b(?:lb|lbs|pound|pounds)\b/.test(normalized)
    ? amount * 0.45359237
    : amount;
  return Math.round(kg * 1000) / 1000;
}

function deriveRestrictionCodes(value: string) {
  return RESTRICTION_RULES
    .filter((rule) => rule.pattern.test(value))
    .map((rule) => rule.code);
}

function deriveSleepBand(value: string) {
  if (["under-5", "5-6"].includes(value)) return "under_6" as const;
  if (value === "6-7") return "6_to_7" as const;
  if (["7-8", "8-plus"].includes(value)) return "7_to_9" as const;
  return "unknown" as const;
}

function deriveActivityLoad(value: string) {
  if (value === "mostly-sitting") return "low" as const;
  if (value === "lightly-active") return "low" as const;
  if (value === "pretty-active") return "moderate" as const;
  if (value === "very-active") return "high" as const;
  return "unknown" as const;
}

function derivePlanStyle(value: string): NormalizedPlanningIntakeV1["preferences"]["planStyle"] {
  if (["simple-repeatable", "strength-focused", "muscle-focused"].includes(value)) return "straight_sets";
  if (["more-variety", "athletic-focused"].includes(value)) return "mixed";
  return "no_preference";
}

function issueSort(left: NormalizationIssue, right: NormalizationIssue) {
  return (
    left.severity.localeCompare(right.severity)
    || left.code.localeCompare(right.code)
    || left.fieldPath.localeCompare(right.fieldPath)
    || left.sourceQuestionIds.join(",").localeCompare(right.sourceQuestionIds.join(","))
  );
}

function canonicalProvenanceResponse(
  responses: CuratedIntakeResponses,
  questionId: string,
) {
  const question = CURATED_QUESTIONS.find((candidate) => candidate.id === questionId);
  const response = responses[questionId];

  if (!question || response === undefined) return null;
  if (typeof response === "boolean") return response;
  if (question.type === "multi" && Array.isArray(response)) {
    const selected = uniqueSorted(response.filter((value) => value !== "other"));
    const other = response.includes("other")
      ? splitText(getStringResponse(responses, `${questionId}Other`))
      : [];
    return { selected, other };
  }
  if (typeof response !== "string") return null;
  if (response === "other") {
    return {
      selected: "other",
      other: normalizeOptionalText(getStringResponse(responses, `${questionId}Other`)),
    };
  }
  if (questionId === "topThreeGoals") return splitRankedText(response);
  if (UNORDERED_TEXT_QUESTION_IDS.has(questionId)) return splitText(response);
  return question.options ? normalizeText(response) : normalizeOptionalText(response);
}

function buildProvenance(responses: CuratedIntakeResponses) {
  const provenance: Record<JsonPointer, ProvenanceEntry[]> = {};
  const add = (path: JsonPointer, questionIds: string[], rule: string) => {
    provenance[path] = questionIds.map((questionId) => ({
      questionId,
      responseDigest: digestCanonicalJson(canonicalProvenanceResponse(responses, questionId)),
      normalizationRule: rule,
    }));
  };

  add("/schedule/requestedDaysPerWeek", ["trainingDaysPerWeek"], "schedule.days.v1");
  add("/schedule/weekdays", ["preferredTrainingDays"], "schedule.weekdays.v1");
  add("/schedule/sessionMinutes", ["workoutLength"], "schedule.duration-band.v1");
  add("/goals/primary", ["primaryGoal", "mainGoals"], "goals.primary.v1");
  add("/goals/secondary", ["topThreeGoals"], "goals.secondary-ranked.v1");
  add("/goals/targetAreas", ["areasToImprove"], "goals.target-areas.v1");
  add("/goals/movementSkills", ["movementsToImprove"], "goals.movement-skills.v1");
  add("/trainingBackground/experience", ["trainingExperience"], "background.experience.v1");
  add("/trainingBackground/recentContinuity", ["currentRoutine"], "background.continuity-unknown.v1");
  add("/trainingBackground/currentProgram", ["currentRoutine", "currentSplit"], "background.current-program.v1");
  add("/trainingBackground/trackingExperience", ["tracksWorkouts"], "background.tracking.v1");
  add("/trainingBackground/knownPerformanceContext", ["mainLiftNumbers"], "background.performance-context.v1");
  add("/environment/locations", ["trainingLocations"], "environment.locations.v1");
  add("/environment/equipmentAvailable", ["availableEquipment"], "environment.equipment-available.v1");
  add("/environment/equipmentAvoided", ["equipmentAvoid"], "environment.equipment-avoided.v1");
  add("/environment/equipmentLimits", ["heaviestDumbbells"], "environment.dumbbell-limit.v1");
  add("/recovery/outsideActivityLoad", ["outsideActivity"], "recovery.activity.v1");
  add("/recovery/sleepBand", ["sleepHours"], "recovery.sleep.v1");
  add("/safety/movementRestrictions", ["professionalRestrictions", "restrictedMovements", "painDetails"], "safety.restrictions.v1");
  add("/safety/excludedExerciseNames", ["exercisesCannotDo"], "safety.cannot-do.v1");
  add("/safety/uncomfortableExerciseNames", ["uncomfortableExercises"], "safety.uncomfortable.v1");
  add("/safety/warningFlags", ["warningSymptoms"], "safety.warning-flags.v1");
  add("/safety/professionalDirection", ["professionalRestrictions", "restrictedMovements"], "safety.professional-direction.v1");
  add("/preferences/preferredExerciseNames", ["exerciseEnjoy"], "preferences.exercise-likes.v1");
  add("/preferences/improvementMovementIds", ["movementsToImprove"], "preferences.improvement-movements.v1");
  add("/preferences/dislikedExerciseNames", ["exerciseHate"], "preferences.exercise-dislikes.v1");
  add("/preferences/planStyle", ["planStyle"], "preferences.plan-style.v1");
  add("/preferences/cardio", ["mainGoals", "areasToImprove", "planStyle"], "preferences.cardio.v1");
  add("/planContext/biggestTrainingStruggles", ["biggestStruggles"], "context.struggles.v1");
  add("/planContext/nutrition", ["tracksFood", "tracksProtein", "eatingPattern", "nutritionDirection", "foodRestrictions", "nutritionHelp"], "context.nutrition.v1");
  add("/planContext/delivery", ["planContents", "planDetail", "deliveryMethod", "followUpConsent"], "context.delivery.v1");

  return provenance;
}

export function normalizeCuratedPlanningIntake(
  data: CuratedOnboardingData,
): NormalizedPlanningIntakeV1 {
  const responses = removeHiddenCuratedResponses(data.intakeResponses);
  const issues = validateResponses(responses);
  const parsedRequestedDays = parseBoundedInteger(
    responses,
    "trainingDaysPerWeek",
    1,
    7,
  ) as NormalizedPlanningIntakeV1["schedule"]["requestedDaysPerWeek"];
  const preferredDays = readMulti(responses, "preferredTrainingDays");
  const flexible = preferredDays.includes("flexible");
  const unsupportedDays = preferredDays.filter((value) => value !== "flexible" && !WEEKDAY_BY_ANSWER[value]);
  const selectedWeekdays = WEEKDAY_ORDER.filter((weekday) => (
    preferredDays.some((value) => WEEKDAY_BY_ANSWER[value] === weekday)
  ));
  const fixedSchedule = (
    !flexible
    && parsedRequestedDays !== null
    && selectedWeekdays.length === parsedRequestedDays
  );
  const countOnlySchedule = flexible && parsedRequestedDays !== null;
  const requestedDays = fixedSchedule || countOnlySchedule
    ? parsedRequestedDays
    : null;
  const weekdays = fixedSchedule ? selectedWeekdays : [];
  const sessionMinutes = deriveSessionMinutes(responses);

  if (unsupportedDays.length > 0) {
    issues.push(makeIssue(
      "UNSUPPORTED_DAY_SELECTION",
      "blocking",
      "/schedule/weekdays",
      ["preferredTrainingDays"],
      { values: unsupportedDays.join(",") },
    ));
  }
  if (
    !flexible
    && parsedRequestedDays !== null
    && selectedWeekdays.length !== parsedRequestedDays
  ) {
    issues.push(makeIssue(
      "DAY_COUNT_MISMATCH",
      "blocking",
      "/schedule/weekdays",
      ["trainingDaysPerWeek", "preferredTrainingDays"],
      {
        requestedDays: parsedRequestedDays,
        selectedDays: selectedWeekdays.length,
      },
    ));
  }
  if (sessionMinutes === null) {
    issues.push(makeIssue(
      "INVALID_SESSION_DURATION",
      "blocking",
      "/schedule/sessionMinutes",
      ["workoutLength"],
    ));
  }
  issues.push(makeIssue(
    "RECENT_CONTINUITY_UNKNOWN",
    "informational",
    "/trainingBackground/recentContinuity",
    ["currentRoutine"],
  ));

  const under18 = readSingle(responses, "under18");
  if (under18 === "yes" && readSingle(responses, "guardianPermission") !== "yes") {
    issues.push(makeIssue(
      "SAFETY_CLEARANCE_REQUIRED",
      "blocking",
      "/safety/guardianPermission",
      ["under18", "guardianPermission"],
    ));
  }

  const painAnswer = getStringResponse(responses, "hasPainOrLimitations");
  const painDetails = getStringResponse(responses, "painDetails");
  const painRestrictionCodes = deriveRestrictionCodes(painDetails);
  if (painAnswer === "yes" && !normalizeOptionalText(painDetails)) {
    issues.push(makeIssue(
      "MISSING_CONDITIONAL_DETAIL",
      "blocking",
      "/safety/movementRestrictions",
      ["hasPainOrLimitations", "painDetails"],
    ));
  } else if (painAnswer === "yes" && painRestrictionCodes.length === 0) {
    issues.push(makeIssue(
      "AMBIGUOUS_SAFETY_RESPONSE",
      "blocking",
      "/safety/movementRestrictions",
      ["hasPainOrLimitations", "painDetails"],
    ));
  }

  const professionalAnswer = getStringResponse(responses, "professionalRestrictions");
  const restrictedMovements = getStringResponse(responses, "restrictedMovements");
  const professionalRestrictionCodes = deriveRestrictionCodes(restrictedMovements);
  if (professionalAnswer === "yes" && !normalizeOptionalText(restrictedMovements)) {
    issues.push(makeIssue(
      "MISSING_CONDITIONAL_DETAIL",
      "blocking",
      "/safety/professionalDirection",
      ["professionalRestrictions", "restrictedMovements"],
    ));
  } else if (professionalAnswer === "yes" && professionalRestrictionCodes.length === 0) {
    issues.push(makeIssue(
      "AMBIGUOUS_SAFETY_RESPONSE",
      "blocking",
      "/safety/professionalDirection",
      ["professionalRestrictions", "restrictedMovements"],
    ));
  }

  const warningFlags = readMulti(responses, "warningSymptoms");
  const activeWarningFlags = warningFlags.filter((value) => value !== "none");
  if (warningFlags.includes("none") && activeWarningFlags.length > 0) {
    issues.push(makeIssue(
      "CONTRADICTORY_SAFETY_RESPONSE",
      "blocking",
      "/safety/warningFlags",
      ["warningSymptoms"],
    ));
  }
  if (activeWarningFlags.length > 0) {
    issues.push(makeIssue(
      "SAFETY_CLEARANCE_REQUIRED",
      "blocking",
      "/safety/warningFlags",
      ["warningSymptoms"],
      { warningFlags: activeWarningFlags.join(",") },
    ));
  }
  if (normalizeOptionalText(getStringResponse(responses, "medicalConditions"))) {
    issues.push(makeIssue(
      "SAFETY_CLEARANCE_REQUIRED",
      "blocking",
      "/safety/medicalConditions",
      ["medicalConditions"],
    ));
  }
  if (["yes", "prefer-not-to-say"].includes(getStringResponse(responses, "medications"))) {
    issues.push(makeIssue(
      "SAFETY_CLEARANCE_REQUIRED",
      "blocking",
      "/safety/medications",
      ["medications", "medicationConsiderations"],
    ));
  }

  const primaryGoal = derivePrimaryGoal(responses);
  const equipmentAvailable = deriveEquipment(responses);
  const equipmentAvoided = deriveEquipmentAvoided(responses);
  const outsideActivityLoad = deriveActivityLoad(getStringResponse(responses, "outsideActivity"));
  const sleepBand = deriveSleepBand(getStringResponse(responses, "sleepHours"));
  const modifierReasons = [
    ...(sleepBand === "under_6" ? ["sleep_under_6"] : []),
    ...(outsideActivityLoad === "high" ? ["high_outside_activity"] : []),
  ];
  const movementRestrictions = uniqueSortedExact([
    ...painRestrictionCodes,
    ...professionalRestrictionCodes,
  ]).map((code) => ({
    code: code as RestrictionCode,
    sourceText: normalizeOptionalText(
      [painDetails, restrictedMovements].filter((value) => deriveRestrictionCodes(value).includes(code as RestrictionCode)).join("; "),
    ) ?? code,
  }));
  const safetyIssues = issues
    .filter((issue) => issue.fieldPath.startsWith("/safety/") && issue.severity === "blocking")
    .sort(issueSort);
  const blocked = safetyIssues.length > 0;
  const restricted = movementRestrictions.length > 0
    || splitText(getStringResponse(responses, "exercisesCannotDo")).length > 0
    || splitText(getStringResponse(responses, "uncomfortableExercises")).length > 0;
  const cardioPrimary = (
    readMulti(responses, "mainGoals").includes("athleticism")
    || readMulti(responses, "areasToImprove").includes("conditioning")
    || getStringResponse(responses, "planStyle") === "athletic-focused"
  );
  const cardioSupporting = readMulti(responses, "planContents").includes("cardio");

  const contractWithoutDigest: Omit<NormalizedPlanningIntakeV1, "generationProjectionDigest"> = {
    contractVersion: NORMALIZED_PLANNING_INTAKE_VERSION,
    source: {
      intakeContractVersion: CURATED_INTAKE_CONTRACT_VERSION,
      normalizerVersion: CURATED_NORMALIZER_VERSION,
      rawResponseDigest: digestCanonicalJson(canonicalRawResponses(responses)),
    },
    schedule: {
      requestedDaysPerWeek: requestedDays,
      weekdays,
      dayConstraint: fixedSchedule
        ? "fixed"
        : countOnlySchedule
          ? "count_only"
          : "unknown",
      flexibility: fixedSchedule
        ? "none"
        : countOnlySchedule
          ? "any_available_day"
          : "unknown",
      sessionMinutes: {
        target: sessionMinutes,
        hardMaximum: sessionMinutes,
      },
      preferredTrainingTime: (
        ["morning", "afternoon", "evening", "night"].includes(getStringResponse(responses, "trainingTime"))
          ? getStringResponse(responses, "trainingTime")
          : readSingle(responses, "trainingTime")
            ? "variable"
            : null
      ) as NormalizedPlanningIntakeV1["schedule"]["preferredTrainingTime"],
    },
    goals: {
      primary: primaryGoal,
      secondary: deriveSecondaryGoals(responses, primaryGoal),
      targetAreas: canonicalRankedValues(readMulti(responses, "areasToImprove")),
      movementSkills: canonicalRankedValues(readMulti(responses, "movementsToImprove")),
      bodyCompositionDirection: (
        ["gain", "lose", "maintain"].includes(getStringResponse(responses, "weightDirection"))
          ? getStringResponse(responses, "weightDirection")
          : "unspecified"
      ) as NormalizedPlanningIntakeV1["goals"]["bodyCompositionDirection"],
    },
    trainingBackground: {
      experience: deriveExperience(responses),
      recentContinuity: "unknown",
      currentProgram: {
        summary: normalizeOptionalText(getStringResponse(responses, "currentRoutine")),
        splitSummary: normalizeOptionalText(getStringResponse(responses, "currentSplit")),
      },
      trackingExperience: deriveTrackingExperience(responses),
      progressionReadiness: "uncalibrated",
      knownPerformanceContext: normalizeOptionalText(getStringResponse(responses, "mainLiftNumbers")),
    },
    environment: {
      locations: readMulti(responses, "trainingLocations").map(normalizeIdentifier).sort(),
      equipmentAvailable,
      equipmentAvoided,
      equipmentLimits: {
        maximumDumbbellLoadKg: parseDumbbellLoadKg(getStringResponse(responses, "heaviestDumbbells")),
        sourceText: normalizeOptionalText(getStringResponse(responses, "heaviestDumbbells")),
      },
    },
    recovery: {
      outsideActivityLoad,
      outsideActivityMinutesPerWeek: null,
      sleepBand,
      planningModifier: modifierReasons.length > 0 ? "conservative" : "standard",
      modifierReasons,
    },
    safety: {
      status: blocked ? "blocked" : restricted ? "restricted" : "clear",
      movementRestrictions,
      excludedExerciseNames: splitText(getStringResponse(responses, "exercisesCannotDo")),
      uncomfortableExerciseNames: splitText(getStringResponse(responses, "uncomfortableExercises")),
      warningFlags: activeWarningFlags,
      unresolvedItems: safetyIssues,
      professionalDirection: {
        present: professionalAnswer === "yes",
        restrictionCodes: professionalRestrictionCodes,
        userReportedClearanceStatus: "unknown",
      },
      acknowledgments: {
        generalGuidance: responses.safetyAcknowledgment === true,
        fitnessGuidance: responses.fitnessGuidanceAcknowledgment === true,
      },
    },
    preferences: {
      requiredExerciseNames: [],
      preferredExerciseNames: splitText(getStringResponse(responses, "exerciseEnjoy")),
      improvementMovementIds: readMulti(responses, "movementsToImprove").map(normalizeIdentifier),
      dislikedExerciseNames: splitText(getStringResponse(responses, "exerciseHate")),
      planStyle: derivePlanStyle(getStringResponse(responses, "planStyle")),
      equipmentPreference: readSingle(responses, "equipmentPreference"),
      cardio: {
        priority: cardioPrimary ? "primary" : cardioSupporting ? "supporting" : "none",
        preferredModalities: [],
        avoidedModalities: equipmentAvoided.filter((value) => ["treadmill", "bike", "rower"].includes(value)),
        requestedSessionsPerWeek: null,
      },
    },
    planContext: {
      biggestTrainingStruggles: readMulti(responses, "biggestStruggles").map(normalizeIdentifier),
      nutrition: {
        trackingStyle: readSingle(responses, "tracksFood"),
        proteinTrackingStyle: readSingle(responses, "tracksProtein"),
        eatingPattern: readSingle(responses, "eatingPattern"),
        direction: readSingle(responses, "nutritionDirection"),
        foodRestrictions: splitText(getStringResponse(responses, "foodRestrictions")),
        requestedSupport: readMulti(responses, "nutritionHelp").map(normalizeIdentifier),
      },
      delivery: {
        detailLevel: ({
          simple: "concise",
          medium: "standard",
          detailed: "detailed",
        } as const)[getStringResponse(responses, "planDetail")] ?? null,
        requestedContents: readMulti(responses, "planContents").map(normalizeIdentifier),
        method: readSingle(responses, "deliveryMethod"),
        followUpStyle: readSingle(responses, "followUpConsent"),
      },
    },
    constraintClasses: {
      blockingIssueCodes: uniqueSortedExact(
        issues.filter((issue) => issue.severity === "blocking").map((issue) => issue.code),
      ),
      hardConstraintPaths: [
        "/schedule/dayConstraint",
        "/schedule/weekdays",
        "/schedule/sessionMinutes/hardMaximum",
        "/environment/equipmentAvailable",
        "/environment/equipmentAvoided",
        "/safety/movementRestrictions",
        "/safety/excludedExerciseNames",
        "/safety/uncomfortableExerciseNames",
      ],
      requiredCoveragePaths: [
        "/goals/primary",
        "/goals/secondary",
        "/goals/targetAreas",
        "/goals/movementSkills",
      ],
      optimizationPaths: [
        "/trainingBackground",
        "/recovery",
        "/preferences",
      ],
      contextOnlyPaths: [
        "/planContext",
        "/trainingBackground/knownPerformanceContext",
        "/safety/acknowledgments",
      ],
    },
    provenance: buildProvenance(responses),
    normalizationIssues: issues.sort(issueSort),
  };

  return {
    ...contractWithoutDigest,
    generationProjectionDigest: digestPlanningGenerationProjection(contractWithoutDigest),
  };
}

export function canonicalizeNormalizedPlanningIntake(input: NormalizedPlanningIntakeV1) {
  return canonicalizeJson(input);
}
