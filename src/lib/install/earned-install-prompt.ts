export const INSTALL_EARNED_MOMENT_STORAGE_KEY = "fawxzzy:fitness:install-earned-moment";
export const INSTALL_EARNED_PROMPT_DISMISSED_STORAGE_KEY = "fawxzzy:fitness:install-earned-prompt-dismissed";

export type InstallEarnedMoment = "workout-completed";

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
    return value === "workout-completed" ? value : null;
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
