export const AMBIENT_THEME_STORAGE_KEY = "fitness:ambient-theme";
export const AMBIENT_THEME_NAMES = ["mint", "ember", "violet"] as const;

export type AmbientThemeName = (typeof AMBIENT_THEME_NAMES)[number];

type StorageLike = Pick<Storage, "getItem" | "removeItem">;

function getBrowserStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function isAmbientThemeName(value: unknown): value is AmbientThemeName {
  return typeof value === "string" && AMBIENT_THEME_NAMES.includes(value as AmbientThemeName);
}

export function readStoredAmbientTheme(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const value = resolvedStorage.getItem(AMBIENT_THEME_STORAGE_KEY);
    return isAmbientThemeName(value) ? value : null;
  } catch {
    resolvedStorage.removeItem(AMBIENT_THEME_STORAGE_KEY);
    return null;
  }
}

export function applyAmbientTheme(
  theme: AmbientThemeName | null,
  root: HTMLElement | null | undefined = typeof document !== "undefined" ? document.documentElement : null,
) {
  if (!root) {
    return;
  }

  if (!theme) {
    delete root.dataset.ambientTheme;
    return;
  }

  root.dataset.ambientTheme = theme;
}
