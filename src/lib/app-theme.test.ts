import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_THEME_CUSTOM_SLOT_IDS,
  APP_THEME_LIBRARY_STORAGE_KEY,
  APP_THEME_NAME_MAX_LENGTH,
  APP_THEME_SELECTION_STORAGE_KEY,
  countAppThemeCustomizations,
  getAppThemeSummary,
  APP_THEME_STORAGE_KEY,
  clearStoredAppThemeSelection,
  DEFAULT_APP_THEME,
  TEST_APP_THEME,
  getNextAvailableAppThemeSlotId,
  getAppThemeCssVariables,
  getAppThemePresetMatch,
  normalizeAppTheme,
  readStoredAppTheme,
  readStoredAppThemeLibrary,
  readStoredAppThemeSelection,
  sanitizeAppThemeName,
  writeStoredAppTheme,
  writeStoredAppThemeLibrary,
  writeStoredAppThemeSelection,
} from "@/lib/app-theme";

function createStorageStub() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test("normalizeAppTheme clamps radii and normalizes colors", () => {
  const theme = normalizeAppTheme({
    preset: "test",
    textPrimaryColor: "#FAE",
    textSecondaryColor: "#BDF",
    textMutedColor: "#789abc",
    primaryActionColor: "#ABC",
    secondaryActionColor: "#FBA",
    accentDividerColor: "#DEF",
    metricAccentColor: "#0f0",
    successCompleteColor: "#123456",
    selectionActiveColor: "654321",
    loaderScanColor: "#89a",
    warningColor: "#fed",
    dangerColor: "#d45",
    surfaceCardColor: "223344",
    cardOutlineColor: "#cde",
    buttonRadius: 99,
    cardRadius: 1,
  });

  assert.equal(theme.preset, "test");
  assert.equal(theme.textPrimaryColor, "#ffaaee");
  assert.equal(theme.textSecondaryColor, "#bbddff");
  assert.equal(theme.textMutedColor, "#789abc");
  assert.equal(theme.primaryActionColor, "#aabbcc");
  assert.equal(theme.secondaryActionColor, "#ffbbaa");
  assert.equal(theme.accentDividerColor, "#ddeeff");
  assert.equal(theme.metricAccentColor, "#00ff00");
  assert.equal(theme.successCompleteColor, "#123456");
  assert.equal(theme.selectionActiveColor, "#654321");
  assert.equal(theme.loaderScanColor, "#8899aa");
  assert.equal(theme.warningColor, "#ffeedd");
  assert.equal(theme.dangerColor, "#dd4455");
  assert.equal(theme.surfaceCardColor, "#223344");
  assert.equal(theme.cardOutlineColor, "#ccddee");
  assert.equal(theme.buttonRadius, 28);
  assert.equal(theme.cardRadius, 14);
});

test("getAppThemeCssVariables derives shared accent and surface variables", () => {
  const cssVariables = getAppThemeCssVariables(TEST_APP_THEME);

  assert.equal(cssVariables["--text-primary"], "234 246 255");
  assert.equal(cssVariables["--text-secondary"], "205 229 244");
  assert.equal(cssVariables["--text-muted"], "144 181 201");
  assert.equal(cssVariables["--accent"], "124 195 255");
  assert.equal(cssVariables["--secondary-action-rgb"], "255 191 103");
  assert.equal(cssVariables["--accent-divider-rgb"], "140 232 217");
  assert.equal(cssVariables["--metric-accent-rgb"], "120 227 143");
  assert.equal(cssVariables["--selection-rgb"], "95 212 255");
  assert.equal(cssVariables["--loader-scan-rgb"], "135 241 255");
  assert.equal(cssVariables["--warning-rgb"], "255 159 89");
  assert.equal(cssVariables["--danger-rgb"], "255 127 150");
  assert.equal(cssVariables["--stroke-soft"], "215 238 255");
  assert.equal(cssVariables["--stroke-strong"], "215 238 255");
  assert.equal(cssVariables["--success-rgb"], "120 227 143");
  assert.equal(cssVariables["--surface-2-rgb"], "31 53 70");
  assert.equal(cssVariables["--button-radius"], "10px");
  assert.equal(cssVariables["--card-radius"], "32px");
});

test("stored default theme clears the persisted harness state", () => {
  const storage = createStorageStub();

  writeStoredAppTheme(DEFAULT_APP_THEME, storage);

  assert.equal(storage.getItem(APP_THEME_STORAGE_KEY), null);
  assert.equal(getAppThemePresetMatch(DEFAULT_APP_THEME), "default");
});

test("stored non-default theme round-trips through storage", () => {
  const storage = createStorageStub();

  writeStoredAppTheme(TEST_APP_THEME, storage);
  const restoredTheme = readStoredAppTheme(storage);

  assert.deepEqual(restoredTheme, TEST_APP_THEME);
});

test("saved theme names preserve spaces and cap at the shared limit", () => {
  const name = sanitizeAppThemeName("   Night Lift Session Deluxe   ");

  assert.equal(name.length, APP_THEME_NAME_MAX_LENGTH);
  assert.equal(name, "   Night Lift S");
});

test("saved theme slots round-trip through storage in slot order", () => {
  const storage = createStorageStub();

  writeStoredAppThemeLibrary([
    {
      id: "custom-2",
      name: "Forest",
      theme: TEST_APP_THEME,
    },
    {
      id: "custom-1",
      name: "Default Plus",
      theme: {
        ...DEFAULT_APP_THEME,
        primaryActionColor: "#335577",
      },
    },
  ], storage);

  assert.notEqual(storage.getItem(APP_THEME_LIBRARY_STORAGE_KEY), null);
  assert.deepEqual(readStoredAppThemeLibrary(storage), [
    {
      id: "custom-1",
      name: "Default Plus",
      theme: {
        ...DEFAULT_APP_THEME,
        primaryActionColor: "#335577",
      },
    },
    {
      id: "custom-2",
      name: "Forest",
      theme: TEST_APP_THEME,
    },
  ]);
  assert.equal(getNextAvailableAppThemeSlotId(readStoredAppThemeLibrary(storage)), "custom-3");
});

test("selected theme slot persists and clears through storage", () => {
  const storage = createStorageStub();

  writeStoredAppThemeSelection("custom-2", storage);

  assert.equal(storage.getItem(APP_THEME_SELECTION_STORAGE_KEY), "custom-2");
  assert.equal(readStoredAppThemeSelection(storage), "custom-2");

  clearStoredAppThemeSelection(storage);

  assert.equal(storage.getItem(APP_THEME_SELECTION_STORAGE_KEY), null);
  assert.equal(readStoredAppThemeSelection(storage), null);
});

test("next available slot resolves null when all custom theme slots are used", () => {
  const allSlots = APP_THEME_CUSTOM_SLOT_IDS.map((slotId, index) => ({
    id: slotId,
    name: `Theme ${index + 1}`,
    theme: index === 0 ? DEFAULT_APP_THEME : TEST_APP_THEME,
  }));

  assert.equal(getNextAvailableAppThemeSlotId(allSlots), null);
});

test("theme summary reports preset and customization state", () => {
  assert.deepEqual(getAppThemeSummary(DEFAULT_APP_THEME), {
    title: "Default theme",
    detail: "Custom colors off",
    basePreset: "default",
    customizationCount: 0,
  });

  const customizedTheme = {
    ...TEST_APP_THEME,
    primaryActionColor: "#112233",
    cardRadius: 30,
  };

  assert.equal(countAppThemeCustomizations(customizedTheme), 2);
  assert.deepEqual(getAppThemeSummary(customizedTheme), {
    title: "Test Theme base",
    detail: "2 custom changes",
    basePreset: "test",
    customizationCount: 2,
  });
});
