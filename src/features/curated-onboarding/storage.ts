import { CURATED_ONBOARDING_DRAFT_VERSION, CURATED_ONBOARDING_STORAGE_PREFIX } from "./constants.ts";
import { createCuratedOnboardingState } from "./fixtures.ts";
import { validateCuratedOnboardingState } from "./schema.ts";
import type { CuratedOnboardingDraft, CuratedOnboardingGateState, CuratedOnboardingState } from "./types.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type VersionedFlagRecord = {
  version: number;
  at: string;
};
type StorageSuffix = "state" | "draft" | "completed" | "entry-seen";

function getStorage(storage?: StorageLike) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function createScopedKey(userId: string, suffix: StorageSuffix) {
  return `${CURATED_ONBOARDING_STORAGE_PREFIX}:${userId}:${suffix}`;
}

function readVersionedFlagAt(userId: string, suffix: "completed" | "entry-seen", storage?: StorageLike) {
  const resolvedStorage = getStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  try {
    const raw = resolvedStorage.getItem(createScopedKey(userId, suffix));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<VersionedFlagRecord>;

    if (
      (parsed.version !== 1 && parsed.version !== CURATED_ONBOARDING_DRAFT_VERSION)
      || typeof parsed.at !== "string"
      || parsed.at.length === 0
    ) {
      return null;
    }

    return parsed.at;
  } catch {
    return null;
  }
}

function hasVersionedFlag(userId: string, suffix: "completed" | "entry-seen", storage?: StorageLike) {
  return readVersionedFlagAt(userId, suffix, storage) !== null;
}

function writeVersionedFlag(userId: string, suffix: "completed" | "entry-seen", at: string, storage?: StorageLike) {
  const resolvedStorage = getStorage(storage);

  if (!resolvedStorage) {
    return false;
  }

  try {
    resolvedStorage.setItem(
      createScopedKey(userId, suffix),
      JSON.stringify({
        version: CURATED_ONBOARDING_DRAFT_VERSION,
        at,
      } satisfies VersionedFlagRecord),
    );
    return true;
  } catch {
    return false;
  }
}

function removeScopedKey(userId: string, suffix: StorageSuffix, storage?: StorageLike) {
  const resolvedStorage = getStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.removeItem(createScopedKey(userId, suffix));
}

function loadLegacyCuratedOnboardingState(userId: string, storage?: StorageLike) {
  const resolvedStorage = getStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  const legacyCompletedAt = readVersionedFlagAt(userId, "completed", storage);

  try {
    const raw = resolvedStorage.getItem(createScopedKey(userId, "draft"));

    if (!raw) {
      return null;
    }

    return validateCuratedOnboardingState(JSON.parse(raw), {
      legacyCompletedAt,
    });
  } catch {
    return null;
  }
}

function syncLegacyCompletionFlag(userId: string, state: CuratedOnboardingState, storage?: StorageLike) {
  if (state.lifecycle.intakeStatus === "completed" && state.lifecycle.completedAt) {
    writeVersionedFlag(userId, "completed", state.lifecycle.completedAt, storage);
    return;
  }

  removeScopedKey(userId, "completed", storage);
}

export function loadCuratedOnboardingState(userId: string, storage?: StorageLike) {
  const resolvedStorage = getStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  const legacyCompletedAt = readVersionedFlagAt(userId, "completed", storage);

  try {
    const raw = resolvedStorage.getItem(createScopedKey(userId, "state"));

    if (raw) {
      const validatedState = validateCuratedOnboardingState(JSON.parse(raw), {
        legacyCompletedAt,
      });

      if (validatedState) {
        return validatedState;
      }
    }
  } catch {
    // Fall back to legacy draft storage if the new state record is malformed.
  }

  return loadLegacyCuratedOnboardingState(userId, storage);
}

export function saveCuratedOnboardingState(userId: string, state: CuratedOnboardingState, storage?: StorageLike) {
  const resolvedStorage = getStorage(storage);

  if (!resolvedStorage) {
    return false;
  }

  try {
    resolvedStorage.setItem(
      createScopedKey(userId, "state"),
      JSON.stringify({
        version: CURATED_ONBOARDING_DRAFT_VERSION,
        ...state,
      }),
    );
    removeScopedKey(userId, "draft", storage);
    syncLegacyCompletionFlag(userId, state, storage);
    return true;
  } catch {
    return false;
  }
}

export function loadCuratedOnboardingDraft(userId: string, storage?: StorageLike) {
  const state = loadCuratedOnboardingState(userId, storage);

  if (!state || state.lifecycle.intakeStatus === "completed") {
    return null;
  }

  return state.draft;
}

export function saveCuratedOnboardingDraft(userId: string, draft: CuratedOnboardingDraft, storage?: StorageLike) {
  const existingState = loadCuratedOnboardingState(userId, storage);
  const nextState: CuratedOnboardingState =
    existingState && existingState.draft.draftId === draft.draftId
      ? {
          ...existingState,
          draft,
          lifecycle: {
            ...existingState.lifecycle,
            intakeStatus: "draft",
            generationStatus: existingState.lifecycle.intakeStatus === "completed" ? "idle" : existingState.lifecycle.generationStatus,
            planId: existingState.lifecycle.intakeStatus === "completed" ? null : existingState.lifecycle.planId,
            completedAt: existingState.lifecycle.intakeStatus === "completed" ? null : existingState.lifecycle.completedAt,
          },
          message: existingState.lifecycle.intakeStatus === "completed" ? null : existingState.message,
        }
      : createCuratedOnboardingState({
          draft,
        });

  return saveCuratedOnboardingState(userId, nextState, storage);
}

export function clearCuratedOnboardingDraft(userId: string, storage?: StorageLike) {
  removeScopedKey(userId, "state", storage);
  removeScopedKey(userId, "draft", storage);
  removeScopedKey(userId, "completed", storage);
}

export function markInitialExperienceSeen(userId: string, at: string, storage?: StorageLike) {
  return writeVersionedFlag(userId, "entry-seen", at, storage);
}

export function loadCuratedOnboardingGateState(userId: string, storage?: StorageLike): CuratedOnboardingGateState {
  const state = loadCuratedOnboardingState(userId, storage);
  const legacyCompletedAt = readVersionedFlagAt(userId, "completed", storage);
  const hasCompletedCuratedIntake = state?.lifecycle.intakeStatus === "completed" || legacyCompletedAt !== null;
  const intakeStatus = state?.lifecycle.intakeStatus ?? (hasCompletedCuratedIntake ? "completed" : "draft");
  const generationStatus = state?.lifecycle.generationStatus ?? (hasCompletedCuratedIntake ? "not-implemented" : "idle");

  return {
    hasCompletedCuratedIntake,
    hasSeenInitialExperience: hasVersionedFlag(userId, "entry-seen", storage),
    savedCuratedDraftId: intakeStatus === "draft" ? state?.draft.draftId ?? null : null,
    intakeStatus,
    generationStatus,
  };
}

export function resetCuratedOnboardingProgress(userId: string, storage?: StorageLike) {
  removeScopedKey(userId, "state", storage);
  removeScopedKey(userId, "draft", storage);
  removeScopedKey(userId, "completed", storage);
  removeScopedKey(userId, "entry-seen", storage);
}
