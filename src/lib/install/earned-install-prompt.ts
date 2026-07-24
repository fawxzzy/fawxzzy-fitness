export const INSTALL_EARNED_MOMENT_STORAGE_KEY = "fawxzzy:fitness:install-earned-moment";
export const INSTALL_EARNED_PROMPT_DISMISSED_STORAGE_KEY = "fawxzzy:fitness:install-earned-prompt-dismissed";
export const INSTALL_RETURN_VISITS_STORAGE_KEY = "fawxzzy:fitness:install-return-visits:v1";

export type InstallEarnedMoment = "workout-completed" | "stable-return";

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function getSessionStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function writeInstallEarnedMoment(moment: InstallEarnedMoment, storage?: StorageLike | null) {
  const resolvedStorage = getSessionStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(INSTALL_EARNED_MOMENT_STORAGE_KEY, moment);
  } catch {
    // Ignore storage failures and continue navigation.
  }
}

export function readInstallEarnedMoment(storage?: StorageLike | null): InstallEarnedMoment | null {
  const resolvedStorage = getSessionStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const value = resolvedStorage.getItem(INSTALL_EARNED_MOMENT_STORAGE_KEY);
    return value === "workout-completed" || value === "stable-return" ? value : null;
  } catch {
    return null;
  }
}

export function recordInstallReturnVisit(args: {
  now?: Date;
  storage?: StorageLike | null;
} = {}): InstallEarnedMoment | null {
  const storage = args.storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!storage) {
    return null;
  }

  const now = args.now ?? new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  try {
    const raw = storage.getItem(INSTALL_RETURN_VISITS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as { days?: unknown; earned?: unknown } : {};
    const days = Array.isArray(parsed.days)
      ? parsed.days.filter((day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day))
      : [];
    const nextDays = [...new Set([...days, today])].sort().slice(-14);
    const alreadyEarned = parsed.earned === true;
    const earned = alreadyEarned || nextDays.length >= 3;
    storage.setItem(INSTALL_RETURN_VISITS_STORAGE_KEY, JSON.stringify({ days: nextDays, earned }));
    return !alreadyEarned && earned ? "stable-return" : null;
  } catch {
    return null;
  }
}

export function clearInstallEarnedMoment(storage?: StorageLike | null) {
  const resolvedStorage = getSessionStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.removeItem(INSTALL_EARNED_MOMENT_STORAGE_KEY);
  } catch {
    // Ignore storage failures and continue rendering.
  }
}

export function consumeInstallEarnedMoment(storage?: StorageLike | null) {
  const resolvedStorage = getSessionStorage(storage);
  const moment = readInstallEarnedMoment(resolvedStorage);
  clearInstallEarnedMoment(resolvedStorage);
  return moment;
}

export function dismissInstallEarnedPromptForSession(storage?: StorageLike | null) {
  const resolvedStorage = getSessionStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(INSTALL_EARNED_PROMPT_DISMISSED_STORAGE_KEY, "1");
  } catch {
    // Ignore storage failures and continue rendering.
  }
}

export function isInstallEarnedPromptDismissedForSession(storage?: StorageLike | null) {
  const resolvedStorage = getSessionStorage(storage);
  if (!resolvedStorage) {
    return false;
  }

  try {
    return resolvedStorage.getItem(INSTALL_EARNED_PROMPT_DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
