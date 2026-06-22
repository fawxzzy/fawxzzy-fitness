export const ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY = "routine-new-draft-v1";
export const ROUTINE_DRAFT_SESSION_STORAGE_KEY = "fawxzzy:fitness:routine-draft-session:v1";
export const ROUTINE_DRAFT_COOKIE_NAME = "fitness_routine_draft_id";
export const ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_KEY = "fawxzzy:fitness:pending-workout-plan-chooser-day-index:v1";
export const ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_COOKIE_NAME = "fitness_pending_workout_plan_chooser_day_index";

export type RoutineDraftSession = {
  routineId: string;
  savedAt: string;
  routineName?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseDocument() {
  return typeof document !== "undefined";
}

function writeRoutineDraftCookie(routineId: string) {
  if (!canUseDocument()) {
    return;
  }

  document.cookie = `${ROUTINE_DRAFT_COOKIE_NAME}=${encodeURIComponent(routineId)}; path=/; max-age=${60 * 60 * 24 * 14}; samesite=lax`;
}

function clearRoutineDraftCookie() {
  if (!canUseDocument()) {
    return;
  }

  document.cookie = `${ROUTINE_DRAFT_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

function writePendingWorkoutPlanChooserDayIndexCookie(dayIndex: number) {
  if (!canUseDocument()) {
    return;
  }

  document.cookie = `${ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_COOKIE_NAME}=${encodeURIComponent(String(dayIndex))}; path=/; max-age=${60 * 10}; samesite=lax`;
}

function clearPendingWorkoutPlanChooserDayIndexCookie() {
  if (!canUseDocument()) {
    return;
  }

  document.cookie = `${ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export function readRoutineDraftSession(): RoutineDraftSession | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ROUTINE_DRAFT_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<RoutineDraftSession>;
    const routineId = typeof parsed.routineId === "string" ? parsed.routineId.trim() : "";
    const savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt.trim() : "";
    const routineName = typeof parsed.routineName === "string" ? parsed.routineName.trim().slice(0, 15) : "";
    if (!routineId || !savedAt) {
      return null;
    }

    return { routineId, savedAt, routineName: routineName || undefined };
  } catch {
    return null;
  }
}

export function writeRoutineDraftSession(routineId: string, routineName?: string | null) {
  if (!canUseStorage()) {
    return;
  }

  const normalizedRoutineId = routineId.trim();
  const normalizedRoutineName = typeof routineName === "string" ? routineName.trim().slice(0, 15) : "";
  if (!normalizedRoutineId) {
    return;
  }

  window.localStorage.setItem(ROUTINE_DRAFT_SESSION_STORAGE_KEY, JSON.stringify({
    routineId: normalizedRoutineId,
    savedAt: new Date().toISOString(),
    routineName: normalizedRoutineName || undefined,
  } satisfies RoutineDraftSession));
  writeRoutineDraftCookie(normalizedRoutineId);
}

export function clearRoutineDraftSession() {
  if (!canUseStorage()) {
    clearRoutineDraftCookie();
    return;
  }

  window.localStorage.removeItem(ROUTINE_DRAFT_SESSION_STORAGE_KEY);
  clearRoutineDraftCookie();
}

export function clearNewRoutineLocalDraft() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY);
}

export function writePendingWorkoutPlanChooserDayIndex(dayIndex: number) {
  if (!canUseStorage() || !Number.isFinite(dayIndex) || dayIndex < 1) {
    return;
  }

  const normalizedDayIndex = Math.floor(dayIndex);
  window.sessionStorage.setItem(
    ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_KEY,
    String(normalizedDayIndex),
  );
  writePendingWorkoutPlanChooserDayIndexCookie(normalizedDayIndex);
}

export function readPendingWorkoutPlanChooserDayIndex() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_KEY);
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function clearPendingWorkoutPlanChooserDayIndex() {
  if (canUseStorage()) {
    window.sessionStorage.removeItem(ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_KEY);
  }
  clearPendingWorkoutPlanChooserDayIndexCookie();
}

export function clearRoutineCreationDraftState() {
  clearRoutineDraftSession();
  clearNewRoutineLocalDraft();
  clearPendingWorkoutPlanChooserDayIndex();
}
