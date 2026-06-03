import type { AmbientThemeName } from "@/lib/ambient/theme";
import { isAmbientThemeName } from "@/lib/ambient/theme";
import type { AppThemeSelectionId, AppThemeSettings } from "@/lib/app-theme";
import { isAppThemePreset, isAppThemeSelectionId } from "@/lib/app-theme";

export type AppBootDisplayMode = "browser" | "standalone";

export type AppBootPreferences = {
  version: 1;
  themeSelection?: AppThemeSelectionId | null;
  theme?: AppThemeSettings | null;
  ambientTheme?: AmbientThemeName | null;
  displayMode?: AppBootDisplayMode | null;
  updatedAt: string;
};

export type AppBootPreferencesUpdate = {
  themeSelection?: AppThemeSelectionId | null;
  theme?: AppThemeSettings | null;
  ambientTheme?: AmbientThemeName | null;
  displayMode?: AppBootDisplayMode | null;
  updatedAt?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type CookieDocumentLike = {
  cookie: string;
};

const APP_BOOT_PREFERENCES_VERSION = 1;
const APP_THEME_BUTTON_RADIUS_MIN = 10;
const APP_THEME_BUTTON_RADIUS_MAX = 28;
const APP_THEME_CARD_RADIUS_MIN = 14;
const APP_THEME_CARD_RADIUS_MAX = 36;
const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

export const APP_BOOT_PREFERENCES_COOKIE_KEY = "fitness_boot_prefs";
export const APP_BOOT_PREFERENCES_STORAGE_KEY = "fitness:boot-preferences";

function canUseBrowser() {
  return typeof window !== "undefined";
}

function getBrowserStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (!canUseBrowser()) {
    return null;
  }

  return window.localStorage;
}

function getCookieDocument(documentLike?: CookieDocumentLike | null) {
  if (documentLike) {
    return documentLike;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return document;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isAppBootDisplayMode(value: unknown): value is AppBootDisplayMode {
  return value === "browser" || value === "standalone";
}

function isNormalizedHexColor(value: unknown) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value.trim());
}

function isRadiusInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.round(value) === value && value >= min && value <= max;
}

function isValidAppThemeSettings(value: unknown): value is AppThemeSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    isAppThemePreset(record.preset)
    && isNormalizedHexColor(record.textPrimaryColor)
    && isNormalizedHexColor(record.textSecondaryColor)
    && isNormalizedHexColor(record.textMutedColor)
    && isNormalizedHexColor(record.primaryActionColor)
    && isNormalizedHexColor(record.secondaryActionColor)
    && isNormalizedHexColor(record.accentDividerColor)
    && isNormalizedHexColor(record.metricAccentColor)
    && isNormalizedHexColor(record.successCompleteColor)
    && isNormalizedHexColor(record.selectionActiveColor)
    && isNormalizedHexColor(record.accentYellowColor)
    && isNormalizedHexColor(record.loaderScanColor)
    && isNormalizedHexColor(record.warningColor)
    && isNormalizedHexColor(record.dangerColor)
    && isNormalizedHexColor(record.surfaceCardColor)
    && isNormalizedHexColor(record.cardOutlineColor)
    && isRadiusInRange(record.buttonRadius, APP_THEME_BUTTON_RADIUS_MIN, APP_THEME_BUTTON_RADIUS_MAX)
    && isRadiusInRange(record.cardRadius, APP_THEME_CARD_RADIUS_MIN, APP_THEME_CARD_RADIUS_MAX)
  );
}

function decodeCookieValue(rawValue: string) {
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function parseCookieString(cookieString: string, key: string) {
  const needle = `${key}=`;
  const parts = cookieString.split(/;\s*/);

  for (const part of parts) {
    if (part.startsWith(needle)) {
      return decodeCookieValue(part.slice(needle.length));
    }
  }

  return null;
}

function sanitizeAppBootPreferences(value: unknown): AppBootPreferences | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.version !== APP_BOOT_PREFERENCES_VERSION || !isIsoTimestamp(record.updatedAt)) {
    return null;
  }

  if ("themeSelection" in record && record.themeSelection !== null && record.themeSelection !== undefined && !isAppThemeSelectionId(record.themeSelection)) {
    return null;
  }

  if ("theme" in record && record.theme !== null && record.theme !== undefined && !isValidAppThemeSettings(record.theme)) {
    return null;
  }

  if ("ambientTheme" in record && record.ambientTheme !== null && record.ambientTheme !== undefined && !isAmbientThemeName(record.ambientTheme)) {
    return null;
  }

  if ("displayMode" in record && record.displayMode !== null && record.displayMode !== undefined && !isAppBootDisplayMode(record.displayMode)) {
    return null;
  }

  const nextPreferences: AppBootPreferences = {
    version: APP_BOOT_PREFERENCES_VERSION,
    updatedAt: record.updatedAt as string,
  };

  if (record.themeSelection !== null && record.themeSelection !== undefined) {
    nextPreferences.themeSelection = record.themeSelection as AppThemeSelectionId;
  }

  if (record.theme !== null && record.theme !== undefined) {
    nextPreferences.theme = record.theme as AppThemeSettings;
  }

  if (record.ambientTheme !== null && record.ambientTheme !== undefined) {
    nextPreferences.ambientTheme = record.ambientTheme as AmbientThemeName;
  }

  if (record.displayMode !== null && record.displayMode !== undefined) {
    nextPreferences.displayMode = record.displayMode as AppBootDisplayMode;
  }

  return nextPreferences;
}

function normalizeUpdatedAt(value?: string): string {
  return isIsoTimestamp(value) ? value : new Date().toISOString();
}

export function serializeAppBootPreferences(preferences: AppBootPreferences) {
  const payload: Record<string, unknown> = {
    version: APP_BOOT_PREFERENCES_VERSION,
    updatedAt: preferences.updatedAt,
  };

  if (preferences.themeSelection) {
    payload.themeSelection = preferences.themeSelection;
  }

  if (preferences.theme) {
    payload.theme = preferences.theme;
  }

  if (preferences.ambientTheme) {
    payload.ambientTheme = preferences.ambientTheme;
  }

  if (preferences.displayMode) {
    payload.displayMode = preferences.displayMode;
  }

  return JSON.stringify(payload);
}

export function parseAppBootPreferencesValue(rawValue: string | null | undefined) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  try {
    return sanitizeAppBootPreferences(JSON.parse(decodeCookieValue(rawValue)));
  } catch {
    return null;
  }
}

export function readAppBootPreferencesCookieValue(rawValue: string | null | undefined) {
  return parseAppBootPreferencesValue(rawValue);
}

export function readAppBootPreferencesCookie(cookieString?: string | null) {
  if (typeof cookieString !== "string" || cookieString.trim().length === 0) {
    return null;
  }

  return parseAppBootPreferencesValue(parseCookieString(cookieString, APP_BOOT_PREFERENCES_COOKIE_KEY));
}

export function readStoredAppBootPreferences(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    return parseAppBootPreferencesValue(resolvedStorage.getItem(APP_BOOT_PREFERENCES_STORAGE_KEY));
  } catch {
    try {
      resolvedStorage.removeItem(APP_BOOT_PREFERENCES_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures and keep the app usable.
    }
    return null;
  }
}

export function resolveAppBootPreferences({
  storage,
  cookieString,
}: {
  storage?: StorageLike | null;
  cookieString?: string | null;
} = {}) {
  return readAppBootPreferencesCookie(cookieString) ?? readStoredAppBootPreferences(storage);
}

export function writeStoredAppBootPreferences(
  preferences: AppBootPreferences | null,
  storage?: StorageLike | null,
) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  if (!preferences) {
    resolvedStorage.removeItem(APP_BOOT_PREFERENCES_STORAGE_KEY);
    return;
  }

  resolvedStorage.setItem(APP_BOOT_PREFERENCES_STORAGE_KEY, serializeAppBootPreferences(preferences));
}

export function writeAppBootPreferencesCookie(
  preferences: AppBootPreferences | null,
  documentLike?: CookieDocumentLike | null,
) {
  const resolvedDocument = getCookieDocument(documentLike);
  if (!resolvedDocument) {
    return;
  }

  if (!preferences) {
    resolvedDocument.cookie = `${APP_BOOT_PREFERENCES_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  resolvedDocument.cookie = `${APP_BOOT_PREFERENCES_COOKIE_KEY}=${encodeURIComponent(serializeAppBootPreferences(preferences))}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function mergeAppBootPreferences(
  update: AppBootPreferencesUpdate,
  args: {
    storage?: StorageLike | null;
    document?: CookieDocumentLike | null;
    cookieString?: string | null;
  } = {},
) {
  const current = resolveAppBootPreferences({
    storage: args.storage,
    cookieString: args.cookieString ?? getCookieDocument(args.document)?.cookie ?? null,
  });

  const nextPreferences: AppBootPreferences = {
    version: APP_BOOT_PREFERENCES_VERSION,
    updatedAt: normalizeUpdatedAt(update.updatedAt),
  };

  const themeSelection = "themeSelection" in update
    ? update.themeSelection
    : current?.themeSelection;
  const theme = "theme" in update
    ? update.theme
    : current?.theme;
  const ambientTheme = "ambientTheme" in update
    ? update.ambientTheme
    : current?.ambientTheme;
  const displayMode = "displayMode" in update
    ? update.displayMode
    : current?.displayMode;

  if (themeSelection && isAppThemeSelectionId(themeSelection)) {
    nextPreferences.themeSelection = themeSelection;
  }

  if (theme && isValidAppThemeSettings(theme)) {
    nextPreferences.theme = theme;
  }

  if (ambientTheme && isAmbientThemeName(ambientTheme)) {
    nextPreferences.ambientTheme = ambientTheme;
  }

  if (displayMode && isAppBootDisplayMode(displayMode)) {
    nextPreferences.displayMode = displayMode;
  }

  writeStoredAppBootPreferences(nextPreferences, args.storage);
  writeAppBootPreferencesCookie(nextPreferences, args.document);

  return nextPreferences;
}
