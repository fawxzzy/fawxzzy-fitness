import {
  CARDIO_PREFERENCE_OPTIONS,
  CURATED_ONBOARDING_DRAFT_VERSION,
  CURATED_ONBOARDING_PRIMARY_DRAFT_ID,
  CURATED_STEP_ORDER,
  DAYS_PER_WEEK_OPTIONS,
  EMPTY_CURATED_ONBOARDING_DATA,
  EQUIPMENT_ACCESS_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  PREFERRED_STYLE_OPTIONS,
  SESSION_LENGTH_OPTIONS,
  TRAINING_GOAL_OPTIONS,
} from "./constants.ts";
import { CURATED_QUESTION_IDS, deriveCuratedEngineData } from "./questionnaire.ts";
import type {
  CuratedGenerationStatus,
  CuratedIntakeStatus,
  CuratedOnboardingData,
  CuratedOnboardingDraft,
  CuratedOnboardingState,
  CuratedStepId,
} from "./types.ts";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((entry) => normalizeString(entry)).filter(Boolean)));
}

function normalizeOptionValue<T extends string>(value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string") {
    return null;
  }

  return allowed.includes(value as T) ? (value as T) : null;
}

function normalizeIntegerValue(value: unknown, allowed: readonly number[]) {
  return typeof value === "number" && Number.isInteger(value) && allowed.includes(value) ? value : null;
}

function cloneEmptyCuratedOnboardingData(): CuratedOnboardingData {
  return {
    ...EMPTY_CURATED_ONBOARDING_DATA,
    intakeResponses: {},
    equipment: [...EMPTY_CURATED_ONBOARDING_DATA.equipment],
    exerciseLikes: [...EMPTY_CURATED_ONBOARDING_DATA.exerciseLikes],
    exerciseDislikes: [...EMPTY_CURATED_ONBOARDING_DATA.exerciseDislikes],
    targetAreas: [...EMPTY_CURATED_ONBOARDING_DATA.targetAreas],
  };
}

function normalizeIntakeResponses(value: unknown) {
  const record = asRecord(value);
  const responses: CuratedOnboardingData["intakeResponses"] = {};

  if (!record) return responses;

  for (const questionId of CURATED_QUESTION_IDS) {
    const valueForQuestion = record[questionId];
    if (typeof valueForQuestion === "boolean") responses[questionId] = valueForQuestion;
    else if (typeof valueForQuestion === "string") responses[questionId] = valueForQuestion.trim();
    else if (Array.isArray(valueForQuestion)) responses[questionId] = normalizeStringArray(valueForQuestion);

    const otherKey = `${questionId}Other`;
    const otherValue = record[otherKey];
    if (typeof otherValue === "string" && otherValue.trim()) responses[otherKey] = otherValue.trim();
  }

  return responses;
}

export function isCuratedStepId(value: unknown): value is CuratedStepId {
  return typeof value === "string" && CURATED_STEP_ORDER.includes(value as CuratedStepId);
}

export function normalizeCuratedOnboardingData(value: unknown): CuratedOnboardingData {
  const record = asRecord(value);
  const next = cloneEmptyCuratedOnboardingData();

  if (!record) {
    return next;
  }

  next.trainingGoal = normalizeOptionValue(record.trainingGoal, TRAINING_GOAL_OPTIONS.map((option) => option.value));
  next.experience = normalizeOptionValue(record.experience, EXPERIENCE_LEVEL_OPTIONS.map((option) => option.value));
  next.daysPerWeek = normalizeIntegerValue(record.daysPerWeek, DAYS_PER_WEEK_OPTIONS);
  next.sessionLengthMinutes = normalizeIntegerValue(record.sessionLengthMinutes, SESSION_LENGTH_OPTIONS);
  next.equipment = normalizeStringArray(record.equipment).filter((value): value is CuratedOnboardingData["equipment"][number] =>
    EQUIPMENT_ACCESS_OPTIONS.some((option) => option.value === value),
  );
  next.preferredStyle = normalizeOptionValue(record.preferredStyle, PREFERRED_STYLE_OPTIONS.map((option) => option.value));
  next.cardioPreference = normalizeOptionValue(record.cardioPreference, CARDIO_PREFERENCE_OPTIONS.map((option) => option.value));
  next.limitations = normalizeString(record.limitations);
  next.exerciseLikes = normalizeStringArray(record.exerciseLikes);
  next.exerciseDislikes = normalizeStringArray(record.exerciseDislikes);
  next.targetAreas = normalizeStringArray(record.targetAreas);
  next.intakeResponses = normalizeIntakeResponses(record.intakeResponses);

  const derived = deriveCuratedEngineData(next.intakeResponses, next);
  Object.assign(next, derived, { intakeResponses: next.intakeResponses });

  return next;
}

export function parseCuratedListInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function formatCuratedListInput(values: string[] | undefined) {
  return (values ?? []).join(", ");
}

export function validateCuratedOnboardingDraft(value: unknown): CuratedOnboardingDraft | null {
  const record = asRecord(value);

  if (!record || record.version !== CURATED_ONBOARDING_DRAFT_VERSION) {
    return null;
  }

  const stepId = isCuratedStepId(record.stepId) ? record.stepId : "intro";
  const updatedAt = normalizeString(record.updatedAt) || new Date(0).toISOString();
  const draftId = normalizeString(record.draftId) || CURATED_ONBOARDING_PRIMARY_DRAFT_ID;

  return {
    version: CURATED_ONBOARDING_DRAFT_VERSION,
    draftId,
    stepId,
    updatedAt,
    data: normalizeCuratedOnboardingData(record.data),
  };
}

function isCuratedIntakeStatus(value: unknown): value is CuratedIntakeStatus {
  return value === "draft" || value === "completed";
}

function isCuratedGenerationStatus(value: unknown): value is CuratedGenerationStatus {
  return value === "idle" || value === "not-implemented" || value === "queued" || value === "ready" || value === "failed";
}

function normalizeLifecycle(record: Record<string, unknown>) {
  const completedAt = typeof record.completedAt === "string" && record.completedAt.trim().length > 0 ? record.completedAt : null;
  const intakeStatus = isCuratedIntakeStatus(record.intakeStatus) ? record.intakeStatus : completedAt ? "completed" : "draft";

  return {
    intakeStatus,
    generationStatus: isCuratedGenerationStatus(record.generationStatus) ? record.generationStatus : "idle",
    planId: typeof record.planId === "string" && record.planId.trim().length > 0 ? record.planId : null,
    completedAt,
  };
}

function migrateLegacyCuratedOnboardingState(record: Record<string, unknown>, legacyCompletedAt: string | null): CuratedOnboardingState | null {
  const legacyDraft = validateCuratedOnboardingDraft({
    version: CURATED_ONBOARDING_DRAFT_VERSION,
    draftId: record.draftId,
    stepId: record.stepId,
    updatedAt: record.updatedAt,
    data: record.data,
  });

  if (!legacyDraft) {
    return null;
  }

  const completedAt = legacyCompletedAt ?? null;
  const draft = {
    ...legacyDraft,
    stepId: completedAt ? "generation-handoff" as const : "intro" as const,
  };

  return {
    draft,
    lifecycle: {
      intakeStatus: completedAt ? "completed" : "draft",
      generationStatus: completedAt ? "not-implemented" : "idle",
      planId: null,
      completedAt,
    },
    message: null,
  };
}

function migrateVersionTwoState(record: Record<string, unknown>, legacyCompletedAt: string | null): CuratedOnboardingState | null {
  const wrapperDraft = asRecord(record.draft);
  const draftSource = wrapperDraft ?? record;
  const version = draftSource.version;

  if (version !== 2) return null;

  const draft = validateCuratedOnboardingDraft({
    version: CURATED_ONBOARDING_DRAFT_VERSION,
    draftId: draftSource.draftId,
    stepId: draftSource.stepId,
    updatedAt: draftSource.updatedAt,
    data: draftSource.data,
  });

  if (!draft) return null;

  const lifecycleSource = asRecord(record.lifecycle);
  const lifecycle = lifecycleSource
    ? normalizeLifecycle(lifecycleSource)
    : {
        intakeStatus: legacyCompletedAt ? "completed" as const : "draft" as const,
        generationStatus: legacyCompletedAt ? "not-implemented" as const : "idle" as const,
        planId: null,
        completedAt: legacyCompletedAt,
      };

  return {
    draft: {
      ...draft,
      stepId: lifecycle.intakeStatus === "completed" ? "generation-handoff" : "intro",
    },
    lifecycle,
    message: typeof record.message === "string" ? record.message : null,
  };
}

export function validateCuratedOnboardingState(value: unknown, options?: { legacyCompletedAt?: string | null }): CuratedOnboardingState | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  if (record.version === CURATED_ONBOARDING_DRAFT_VERSION && asRecord(record.draft) && asRecord(record.lifecycle)) {
    const draftRecord = validateCuratedOnboardingDraft(record.draft);
    const lifecycleRecord = normalizeLifecycle(asRecord(record.lifecycle) ?? {});

    if (!draftRecord) {
      return null;
    }

    return {
      draft: draftRecord,
      lifecycle: lifecycleRecord,
      message: typeof record.message === "string" ? record.message : null,
    };
  }

  if (record.version === 2) {
    return migrateVersionTwoState(record, options?.legacyCompletedAt ?? null);
  }

  if (record.version === 1) {
    return migrateLegacyCuratedOnboardingState(record, options?.legacyCompletedAt ?? null);
  }

  return null;
}
