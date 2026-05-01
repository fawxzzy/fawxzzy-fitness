export type AppThemePreset = "default" | "test";
export type CustomAppThemeSlotId = "custom-1" | "custom-2" | "custom-3";

export type AppThemeSettings = {
  preset: AppThemePreset;
  textPrimaryColor: string;
  textSecondaryColor: string;
  textMutedColor: string;
  primaryActionColor: string;
  secondaryActionColor: string;
  accentDividerColor: string;
  successCompleteColor: string;
  selectionActiveColor: string;
  loaderScanColor: string;
  warningColor: string;
  dangerColor: string;
  surfaceCardColor: string;
  buttonRadius: number;
  cardRadius: number;
};

export type SavedAppThemeSlot = {
  id: CustomAppThemeSlotId;
  name: string;
  theme: AppThemeSettings;
};

type RgbTuple = readonly [number, number, number];
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const APP_THEME_VERSION = 2;
const APP_THEME_LIBRARY_VERSION = 1;
export const APP_THEME_STORAGE_KEY = "fawxzzy:app-theme";
export const APP_THEME_LIBRARY_STORAGE_KEY = "fawxzzy:app-theme-library";
export const APP_THEME_SELECTION_STORAGE_KEY = "fawxzzy:app-theme-selection";
export const APP_THEME_NAME_MAX_LENGTH = 15;
export const APP_THEME_CUSTOM_SLOT_IDS = ["custom-1", "custom-2", "custom-3"] as const;

const DEFAULT_PRIMARY_ACTION_COLOR = "#20974e";
const DEFAULT_SECONDARY_ACTION_COLOR = "#cd9742";
const DEFAULT_TEXT_PRIMARY_COLOR = "#f4f8fc";
const DEFAULT_TEXT_SECONDARY_COLOR = "#cdd9e8";
const DEFAULT_TEXT_MUTED_COLOR = "#90a4bc";
const DEFAULT_ACCENT_DIVIDER_COLOR = "#20974e";
const DEFAULT_SUCCESS_COMPLETE_COLOR = "#20974e";
const DEFAULT_SELECTION_ACTIVE_COLOR = "#20974e";
const DEFAULT_LOADER_SCAN_COLOR = "#20794e";
const DEFAULT_WARNING_COLOR = "#f0b24e";
const DEFAULT_DANGER_COLOR = "#ff6f83";
const DEFAULT_SURFACE_CARD_COLOR = "#0a0b0f";
const DEFAULT_BUTTON_RADIUS = 20;
const DEFAULT_CARD_RADIUS = 20;

export const DEFAULT_APP_THEME: AppThemeSettings = {
  preset: "default",
  textPrimaryColor: DEFAULT_TEXT_PRIMARY_COLOR,
  textSecondaryColor: DEFAULT_TEXT_SECONDARY_COLOR,
  textMutedColor: DEFAULT_TEXT_MUTED_COLOR,
  primaryActionColor: DEFAULT_PRIMARY_ACTION_COLOR,
  secondaryActionColor: DEFAULT_SECONDARY_ACTION_COLOR,
  accentDividerColor: DEFAULT_ACCENT_DIVIDER_COLOR,
  successCompleteColor: DEFAULT_SUCCESS_COMPLETE_COLOR,
  selectionActiveColor: DEFAULT_SELECTION_ACTIVE_COLOR,
  loaderScanColor: DEFAULT_LOADER_SCAN_COLOR,
  warningColor: DEFAULT_WARNING_COLOR,
  dangerColor: DEFAULT_DANGER_COLOR,
  surfaceCardColor: DEFAULT_SURFACE_CARD_COLOR,
  buttonRadius: DEFAULT_BUTTON_RADIUS,
  cardRadius: DEFAULT_CARD_RADIUS,
};

export const TEST_APP_THEME: AppThemeSettings = {
  preset: "test",
  textPrimaryColor: "#eaf6ff",
  textSecondaryColor: "#cde5f4",
  textMutedColor: "#90b5c9",
  primaryActionColor: "#7cc3ff",
  secondaryActionColor: "#ffbf67",
  accentDividerColor: "#8ce8d9",
  successCompleteColor: "#78e38f",
  selectionActiveColor: "#5fd4ff",
  loaderScanColor: "#87f1ff",
  warningColor: "#ff9f59",
  dangerColor: "#ff7f96",
  surfaceCardColor: "#1f3546",
  buttonRadius: 10,
  cardRadius: 32,
};

export const APP_THEME_PRESETS: Record<AppThemePreset, AppThemeSettings> = {
  default: DEFAULT_APP_THEME,
  test: TEST_APP_THEME,
};
export const APP_THEME_CHANGE_EVENT = "atlas:app-theme-change";

const MIN_BUTTON_RADIUS = 10;
const MAX_BUTTON_RADIUS = 28;
const MIN_CARD_RADIUS = 14;
const MAX_CARD_RADIUS = 36;
const DEEP_BACKGROUND_RGB: RgbTuple = [7, 17, 27];
const WHITE_RGB: RgbTuple = [255, 255, 255];

const APP_THEME_VARIABLE_NAMES = [
  "--accent",
  "--accent-strong",
  "--accent-mint",
  "--accent-mint-strong",
  "--accent-blue",
  "--accent-red",
  "--accent-purple",
  "--secondary-action-rgb",
  "--accent-divider-rgb",
  "--selection-rgb",
  "--loader-scan-rgb",
  "--warning-rgb",
  "--danger-rgb",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--text",
  "--muted",
  "--faint",
  "--accent-yellow-off",
  "--accent-yellow-on",
  "--success-rgb",
  "--surface-1-rgb",
  "--surface-2-rgb",
  "--surface-3-rgb",
  "--bg-panel",
  "--bg-card",
  "--bg-shell",
  "--surface",
  "--surface-2",
  "--surface-rgb",
  "--shell-rgb",
  "--surface-muted",
  "--glass-tint-rgb",
  "--button-radius",
  "--button-destructive-bg",
  "--button-destructive-bg-hover",
  "--button-destructive-bg-active",
  "--button-destructive-text",
  "--button-destructive-border",
  "--bottom-action-radius",
  "--action-chrome-shell-radius",
  "--action-chrome-segment-radius",
  "--action-chrome-segment-radius-compact",
  "--card-radius",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
] as const;

const APP_THEME_CUSTOMIZATION_KEYS = [
  "textPrimaryColor",
  "textSecondaryColor",
  "textMutedColor",
  "primaryActionColor",
  "secondaryActionColor",
  "accentDividerColor",
  "successCompleteColor",
  "selectionActiveColor",
  "loaderScanColor",
  "warningColor",
  "dangerColor",
  "surfaceCardColor",
  "buttonRadius",
  "cardRadius",
] as const satisfies ReadonlyArray<keyof AppThemeSettings>;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[\da-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase();
  }

  if (/^#[\da-fA-F]{3}$/.test(hex)) {
    const [, first, second, third] = hex;
    return `#${first}${first}${second}${second}${third}${third}`.toLowerCase();
  }

  return fallback;
}

function normalizeRadius(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return clamp(Math.round(value), min, max);
}

function isCustomAppThemeSlotId(value: unknown): value is CustomAppThemeSlotId {
  return typeof value === "string" && APP_THEME_CUSTOM_SLOT_IDS.includes(value as CustomAppThemeSlotId);
}

function isThemeSelectionId(value: unknown): value is "default" | CustomAppThemeSlotId {
  return value === "default" || isCustomAppThemeSlotId(value);
}

export function sanitizeAppThemeName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, APP_THEME_NAME_MAX_LENGTH);
}

function toRgbTuple(hexColor: string): RgbTuple {
  const normalized = normalizeHexColor(hexColor, DEFAULT_PRIMARY_ACTION_COLOR);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function mixRgb(source: RgbTuple, target: RgbTuple, amount: number): RgbTuple {
  const ratio = clamp(amount, 0, 1);
  return [
    Math.round(source[0] + (target[0] - source[0]) * ratio),
    Math.round(source[1] + (target[1] - source[1]) * ratio),
    Math.round(source[2] + (target[2] - source[2]) * ratio),
  ];
}

function toRgbCssValue(rgb: RgbTuple) {
  return rgb.join(" ");
}

function toPixelValue(value: number) {
  return `${Math.round(value)}px`;
}

function deriveSurfacePalette(surfaceCardColor: string) {
  const surface2 = toRgbTuple(surfaceCardColor);
  const surface1 = mixRgb(surface2, DEEP_BACKGROUND_RGB, 0.28);
  const surface3 = mixRgb(surface2, WHITE_RGB, 0.12);

  return { surface1, surface2, surface3 };
}

function deriveCardRadiusScale(cardRadius: number) {
  return {
    cardRadius: toPixelValue(cardRadius),
    radiusSm: toPixelValue(clamp(cardRadius - 8, 10, cardRadius)),
    radiusMd: toPixelValue(clamp(cardRadius - 4, 12, cardRadius)),
    radiusLg: toPixelValue(cardRadius),
    radiusXl: toPixelValue(cardRadius + 6),
  };
}

function deriveButtonRadiusScale(buttonRadius: number) {
  return {
    buttonRadius: toPixelValue(buttonRadius),
    bottomActionRadius: toPixelValue(clamp(buttonRadius + 8, 18, 40)),
    actionChromeShellRadius: toPixelValue(clamp(buttonRadius + 4, 16, 36)),
    actionChromeSegmentRadius: toPixelValue(buttonRadius),
    actionChromeSegmentRadiusCompact: toPixelValue(clamp(buttonRadius - 2, 8, buttonRadius)),
  };
}

export function normalizeAppTheme(value: Partial<AppThemeSettings> | null | undefined): AppThemeSettings {
  const preset = value?.preset === "test" ? "test" : "default";

  return {
    preset,
    textPrimaryColor: normalizeHexColor(value?.textPrimaryColor, DEFAULT_TEXT_PRIMARY_COLOR),
    textSecondaryColor: normalizeHexColor(value?.textSecondaryColor, DEFAULT_TEXT_SECONDARY_COLOR),
    textMutedColor: normalizeHexColor(value?.textMutedColor, DEFAULT_TEXT_MUTED_COLOR),
    primaryActionColor: normalizeHexColor(value?.primaryActionColor, DEFAULT_PRIMARY_ACTION_COLOR),
    secondaryActionColor: normalizeHexColor(value?.secondaryActionColor, DEFAULT_SECONDARY_ACTION_COLOR),
    accentDividerColor: normalizeHexColor(value?.accentDividerColor, DEFAULT_ACCENT_DIVIDER_COLOR),
    successCompleteColor: normalizeHexColor(value?.successCompleteColor, DEFAULT_SUCCESS_COMPLETE_COLOR),
    selectionActiveColor: normalizeHexColor(value?.selectionActiveColor, DEFAULT_SELECTION_ACTIVE_COLOR),
    loaderScanColor: normalizeHexColor(value?.loaderScanColor, DEFAULT_LOADER_SCAN_COLOR),
    warningColor: normalizeHexColor(value?.warningColor, DEFAULT_WARNING_COLOR),
    dangerColor: normalizeHexColor(value?.dangerColor, DEFAULT_DANGER_COLOR),
    surfaceCardColor: normalizeHexColor(value?.surfaceCardColor, DEFAULT_SURFACE_CARD_COLOR),
    buttonRadius: normalizeRadius(value?.buttonRadius, DEFAULT_BUTTON_RADIUS, MIN_BUTTON_RADIUS, MAX_BUTTON_RADIUS),
    cardRadius: normalizeRadius(value?.cardRadius, DEFAULT_CARD_RADIUS, MIN_CARD_RADIUS, MAX_CARD_RADIUS),
  };
}

export function areAppThemesEqual(left: AppThemeSettings, right: AppThemeSettings) {
  return (
    left.preset === right.preset
    && left.textPrimaryColor === right.textPrimaryColor
    && left.textSecondaryColor === right.textSecondaryColor
    && left.textMutedColor === right.textMutedColor
    && left.primaryActionColor === right.primaryActionColor
    && left.secondaryActionColor === right.secondaryActionColor
    && left.accentDividerColor === right.accentDividerColor
    && left.successCompleteColor === right.successCompleteColor
    && left.selectionActiveColor === right.selectionActiveColor
    && left.loaderScanColor === right.loaderScanColor
    && left.warningColor === right.warningColor
    && left.dangerColor === right.dangerColor
    && left.surfaceCardColor === right.surfaceCardColor
    && left.buttonRadius === right.buttonRadius
    && left.cardRadius === right.cardRadius
  );
}

export function getAppThemePresetMatch(theme: AppThemeSettings): AppThemePreset | null {
  if (areAppThemesEqual(theme, DEFAULT_APP_THEME)) {
    return "default";
  }

  if (areAppThemesEqual(theme, TEST_APP_THEME)) {
    return "test";
  }

  return null;
}

export function getAppThemeCssVariables(theme: AppThemeSettings) {
  const accent = toRgbTuple(theme.primaryActionColor);
  const accentStrong = mixRgb(accent, WHITE_RGB, 0.16);
  const secondaryAction = toRgbTuple(theme.secondaryActionColor);
  const accentDivider = toRgbTuple(theme.accentDividerColor);
  const successComplete = toRgbTuple(theme.successCompleteColor);
  const selectionActive = toRgbTuple(theme.selectionActiveColor);
  const loaderScan = toRgbTuple(theme.loaderScanColor);
  const warning = toRgbTuple(theme.warningColor);
  const danger = toRgbTuple(theme.dangerColor);
  const textPrimary = toRgbTuple(theme.textPrimaryColor);
  const textSecondary = toRgbTuple(theme.textSecondaryColor);
  const textMuted = toRgbTuple(theme.textMutedColor);
  const destructiveBg = mixRgb(danger, DEEP_BACKGROUND_RGB, 0.84);
  const destructiveBgHover = mixRgb(danger, DEEP_BACKGROUND_RGB, 0.8);
  const destructiveBgActive = mixRgb(danger, DEEP_BACKGROUND_RGB, 0.88);
  const destructiveText = mixRgb(danger, WHITE_RGB, 0.78);
  const { surface1, surface2, surface3 } = deriveSurfacePalette(theme.surfaceCardColor);
  const buttonScale = deriveButtonRadiusScale(theme.buttonRadius);
  const cardScale = deriveCardRadiusScale(theme.cardRadius);

  return {
    "--text-primary": toRgbCssValue(textPrimary),
    "--text-secondary": toRgbCssValue(textSecondary),
    "--text-muted": toRgbCssValue(textMuted),
    "--text": "var(--text-primary)",
    "--muted": "var(--text-secondary)",
    "--faint": "var(--text-muted)",
    "--accent": toRgbCssValue(accent),
    "--accent-strong": toRgbCssValue(accentStrong),
    "--accent-mint": toRgbCssValue(accent),
    "--accent-mint-strong": toRgbCssValue(accentStrong),
    "--accent-blue": toRgbCssValue(accent),
    "--accent-red": toRgbCssValue(danger),
    "--accent-purple": toRgbCssValue(accent),
    "--secondary-action-rgb": toRgbCssValue(secondaryAction),
    "--accent-divider-rgb": toRgbCssValue(accentDivider),
    "--selection-rgb": toRgbCssValue(selectionActive),
    "--loader-scan-rgb": toRgbCssValue(loaderScan),
    "--warning-rgb": toRgbCssValue(warning),
    "--danger-rgb": toRgbCssValue(danger),
    "--accent-yellow-off": "var(--warning-rgb)",
    "--accent-yellow-on": "var(--warning-rgb)",
    "--success-rgb": toRgbCssValue(successComplete),
    "--surface-1-rgb": toRgbCssValue(surface1),
    "--surface-2-rgb": toRgbCssValue(surface2),
    "--surface-3-rgb": toRgbCssValue(surface3),
    "--bg-panel": "var(--surface-1-rgb)",
    "--bg-card": "var(--surface-2-rgb)",
    "--bg-shell": "var(--surface-3-rgb)",
    "--surface": "var(--surface-1-rgb)",
    "--surface-2": "var(--surface-2-rgb)",
    "--surface-rgb": "var(--surface-2-rgb)",
    "--shell-rgb": "var(--surface-3-rgb)",
    "--surface-muted": "var(--surface-2-rgb)",
    "--glass-tint-rgb": "var(--surface-1-rgb)",
    "--button-radius": buttonScale.buttonRadius,
    "--button-destructive-bg": `${toRgbCssValue(destructiveBg)} / 0.94`,
    "--button-destructive-bg-hover": `${toRgbCssValue(destructiveBgHover)} / 0.98`,
    "--button-destructive-bg-active": `${toRgbCssValue(destructiveBgActive)} / 1`,
    "--button-destructive-text": toRgbCssValue(destructiveText),
    "--button-destructive-border": `${toRgbCssValue(danger)} / 0.4`,
    "--bottom-action-radius": buttonScale.bottomActionRadius,
    "--action-chrome-shell-radius": buttonScale.actionChromeShellRadius,
    "--action-chrome-segment-radius": buttonScale.actionChromeSegmentRadius,
    "--action-chrome-segment-radius-compact": buttonScale.actionChromeSegmentRadiusCompact,
    "--card-radius": cardScale.cardRadius,
    "--radius-sm": cardScale.radiusSm,
    "--radius-md": cardScale.radiusMd,
    "--radius-lg": cardScale.radiusLg,
    "--radius-xl": cardScale.radiusXl,
  } as const;
}

function getBrowserStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function dispatchAppThemeChange(theme: AppThemeSettings) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(new CustomEvent(APP_THEME_CHANGE_EVENT, {
    detail: theme,
  }));
}

export function countAppThemeCustomizations(theme: AppThemeSettings) {
  const presetMatch = getAppThemePresetMatch(theme);
  if (presetMatch) {
    return 0;
  }

  const basePreset = theme.preset === "test" ? "test" : "default";
  const baseTheme = APP_THEME_PRESETS[basePreset];

  return APP_THEME_CUSTOMIZATION_KEYS.reduce((count, key) => (
    theme[key] === baseTheme[key] ? count : count + 1
  ), 0);
}

export function getAppThemeSummary(theme: AppThemeSettings) {
  const presetMatch = getAppThemePresetMatch(theme);
  const basePreset = theme.preset === "test" ? "test" : "default";
  const baseLabel = basePreset === "test" ? "Test Theme" : "Default theme";

  if (presetMatch) {
    return {
      title: presetMatch === "test" ? "Test Theme" : "Default theme",
      detail: "Custom colors off",
      basePreset,
      customizationCount: 0,
    } as const;
  }

  const customizationCount = countAppThemeCustomizations(theme);

  return {
    title: `${baseLabel} base`,
    detail: `${customizationCount} custom ${customizationCount === 1 ? "change" : "changes"}`,
    basePreset,
    customizationCount,
  } as const;
}

export function readStoredAppThemeLibrary(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return [] as SavedAppThemeSlot[];
  }

  try {
    const rawValue = resolvedStorage.getItem(APP_THEME_LIBRARY_STORAGE_KEY);
    if (!rawValue) {
      return [] as SavedAppThemeSlot[];
    }

    const parsed = JSON.parse(rawValue) as {
      version?: number;
      themes?: Array<{
        id?: unknown;
        name?: unknown;
        theme?: Partial<AppThemeSettings>;
      }>;
    };

    if (parsed.version !== APP_THEME_LIBRARY_VERSION || !Array.isArray(parsed.themes)) {
      resolvedStorage.removeItem(APP_THEME_LIBRARY_STORAGE_KEY);
      return [] as SavedAppThemeSlot[];
    }

    const seenIds = new Set<CustomAppThemeSlotId>();
    const normalizedThemes: SavedAppThemeSlot[] = [];

    for (const entry of parsed.themes) {
      if (!isCustomAppThemeSlotId(entry?.id) || seenIds.has(entry.id)) {
        continue;
      }

      const name = sanitizeAppThemeName(entry.name);
      if (!name) {
        continue;
      }

      seenIds.add(entry.id);
      normalizedThemes.push({
        id: entry.id,
        name,
        theme: normalizeAppTheme(entry.theme),
      });
    }

    return normalizedThemes
      .sort((left, right) => APP_THEME_CUSTOM_SLOT_IDS.indexOf(left.id) - APP_THEME_CUSTOM_SLOT_IDS.indexOf(right.id));
  } catch {
    resolvedStorage.removeItem(APP_THEME_LIBRARY_STORAGE_KEY);
    return [] as SavedAppThemeSlot[];
  }
}

export function writeStoredAppThemeLibrary(themes: SavedAppThemeSlot[], storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  const seenIds = new Set<CustomAppThemeSlotId>();
  const normalizedThemes: SavedAppThemeSlot[] = [];

  for (const theme of themes) {
    if (!isCustomAppThemeSlotId(theme.id) || seenIds.has(theme.id)) {
      continue;
    }

    const name = sanitizeAppThemeName(theme.name);
    if (!name) {
      continue;
    }

    seenIds.add(theme.id);
    normalizedThemes.push({
      id: theme.id,
      name,
      theme: normalizeAppTheme(theme.theme),
    });
  }

  normalizedThemes.sort((left, right) => APP_THEME_CUSTOM_SLOT_IDS.indexOf(left.id) - APP_THEME_CUSTOM_SLOT_IDS.indexOf(right.id));

  if (normalizedThemes.length === 0) {
    resolvedStorage.removeItem(APP_THEME_LIBRARY_STORAGE_KEY);
    return;
  }

  resolvedStorage.setItem(APP_THEME_LIBRARY_STORAGE_KEY, JSON.stringify({
    version: APP_THEME_LIBRARY_VERSION,
    themes: normalizedThemes,
  }));
}

export function getNextAvailableAppThemeSlotId(themes: SavedAppThemeSlot[]) {
  const usedIds = new Set(themes.map((theme) => theme.id));
  return APP_THEME_CUSTOM_SLOT_IDS.find((slotId) => !usedIds.has(slotId)) ?? null;
}

export function readStoredAppThemeSelection(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const rawValue = resolvedStorage.getItem(APP_THEME_SELECTION_STORAGE_KEY);
    return isThemeSelectionId(rawValue) ? rawValue : null;
  } catch {
    resolvedStorage.removeItem(APP_THEME_SELECTION_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAppThemeSelection(selection: "default" | CustomAppThemeSlotId, storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(APP_THEME_SELECTION_STORAGE_KEY, selection);
}

export function clearStoredAppThemeSelection(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  resolvedStorage?.removeItem(APP_THEME_SELECTION_STORAGE_KEY);
}

export function readStoredAppTheme(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const rawValue = resolvedStorage.getItem(APP_THEME_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as {
      version?: number;
      theme?: Partial<AppThemeSettings>;
    };

    if (parsed.version !== APP_THEME_VERSION || !parsed.theme) {
      resolvedStorage.removeItem(APP_THEME_STORAGE_KEY);
      return null;
    }

    return normalizeAppTheme(parsed.theme);
  } catch {
    resolvedStorage.removeItem(APP_THEME_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAppTheme(theme: AppThemeSettings, storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  if (getAppThemePresetMatch(theme) === "default") {
    resolvedStorage.removeItem(APP_THEME_STORAGE_KEY);
    dispatchAppThemeChange(DEFAULT_APP_THEME);
    return;
  }

  resolvedStorage.setItem(APP_THEME_STORAGE_KEY, JSON.stringify({
    version: APP_THEME_VERSION,
    theme,
  }));
  dispatchAppThemeChange(theme);
}

export function clearStoredAppTheme(storage?: StorageLike | null) {
  const resolvedStorage = getBrowserStorage(storage);
  resolvedStorage?.removeItem(APP_THEME_STORAGE_KEY);
  dispatchAppThemeChange(DEFAULT_APP_THEME);
}

export function clearAppliedAppTheme(root: HTMLElement | null | undefined = typeof document !== "undefined" ? document.documentElement : null) {
  if (!root) {
    return;
  }

  for (const variableName of APP_THEME_VARIABLE_NAMES) {
    root.style.removeProperty(variableName);
  }
}

export function applyAppTheme(theme: AppThemeSettings, root: HTMLElement | null | undefined = typeof document !== "undefined" ? document.documentElement : null) {
  if (!root) {
    return;
  }

  if (getAppThemePresetMatch(theme) === "default") {
    clearAppliedAppTheme(root);
    return;
  }

  const cssVariables = getAppThemeCssVariables(theme);
  for (const [variableName, value] of Object.entries(cssVariables)) {
    root.style.setProperty(variableName, value);
  }
}
