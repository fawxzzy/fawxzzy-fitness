import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  APP_THEME_CUSTOM_SLOT_IDS,
  APP_THEME_LIBRARY_STORAGE_KEY,
  APP_THEME_NAME_MAX_LENGTH,
  APP_THEME_PRESETS,
  APP_THEME_SELECTION_STORAGE_KEY,
  countAppThemeCustomizations,
  getAppThemeSummary,
  APP_THEME_STORAGE_KEY,
  clearStoredAppThemeSelection,
  DEFAULT_APP_THEME,
  ROSE_APP_THEME,
  TEST_APP_THEME,
  getAppThemePresetLabel,
  getNextAvailableAppThemeSlotId,
  getAppThemeCssVariables,
  getAppThemePresetMatch,
  normalizeAppTheme,
  readStoredAppTheme,
  readStoredAppThemeLibrary,
  readStoredAppThemeSelection,
  resolveStoredAppTheme,
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

test("rose theme preset is registered as a first-class preset", () => {
  assert.equal(ROSE_APP_THEME.preset, "rose");
  assert.equal(ROSE_APP_THEME.primaryActionColor, "#ff4fa3");
  assert.equal(ROSE_APP_THEME.accentDividerColor, "#ff5fb3");
  assert.equal(ROSE_APP_THEME.metricAccentColor, "#ff5fb3");
  assert.equal(ROSE_APP_THEME.cardOutlineColor, "#ff5fb3");
  assert.equal(APP_THEME_PRESETS.rose, ROSE_APP_THEME);
  assert.equal(getAppThemePresetLabel("rose"), "Rose Circuit");
  assert.equal(getAppThemePresetMatch(ROSE_APP_THEME), "rose");
});

test("rose theme CSS variables keep metric strips and outlines aligned", () => {
  const cssVariables = getAppThemeCssVariables(ROSE_APP_THEME);

  assert.equal(cssVariables["--accent-divider-rgb"], "255 95 179");
  assert.equal(cssVariables["--metric-accent-rgb"], "255 95 179");
  assert.equal(cssVariables["--stroke-soft"], "255 95 179");
  assert.equal(cssVariables["--stroke-strong"], "255 95 179");
  assert.equal(cssVariables["--selection-rgb"], "255 79 163");
  assert.equal(cssVariables["--success-rgb"], "255 123 192");
});

test("default app theme keeps metric and outline accents aligned to the crisp green", () => {
  assert.equal(DEFAULT_APP_THEME.primaryActionColor, "#20974e");
  assert.equal(DEFAULT_APP_THEME.accentDividerColor, "#20974e");
  assert.equal(DEFAULT_APP_THEME.metricAccentColor, "#20974e");
  assert.equal(DEFAULT_APP_THEME.successCompleteColor, "#20974e");
  assert.equal(DEFAULT_APP_THEME.selectionActiveColor, "#20974e");
  assert.equal(DEFAULT_APP_THEME.cardOutlineColor, "#20974e");

  const cssVariables = getAppThemeCssVariables(DEFAULT_APP_THEME);
  assert.equal(cssVariables["--accent-divider-rgb"], "32 151 78");
  assert.equal(cssVariables["--metric-accent-rgb"], "32 151 78");
  assert.equal(cssVariables["--success-rgb"], "32 151 78");
  assert.equal(cssVariables["--selection-rgb"], "32 151 78");
  assert.equal(cssVariables["--stroke-soft"], "32 151 78");
  assert.equal(cssVariables["--stroke-strong"], "32 151 78");
});

test("normalizeAppTheme falls back to the crisp green for metric accent and card outline", () => {
  const theme = normalizeAppTheme({
    metricAccentColor: "not-a-color",
    cardOutlineColor: null as never,
  });

  assert.equal(theme.metricAccentColor, "#20974e");
  assert.equal(theme.cardOutlineColor, "#20974e");
});

test("root CSS defines the default metric and card stroke tokens for default theme mode", () => {
  const globalsPath = path.resolve(process.cwd(), "src/app/globals.css");
  const globalsCss = readFileSync(globalsPath, "utf8");

  assert.match(globalsCss, /--metric-accent-rgb:\s*32 151 78;/);
  assert.match(globalsCss, /--stroke-soft:\s*32 151 78;/);
  assert.match(globalsCss, /--stroke-strong:\s*32 151 78;/);
});

test("stored default theme clears the persisted harness state", () => {
  const storage = createStorageStub();

  writeStoredAppTheme(DEFAULT_APP_THEME, storage);

  assert.equal(storage.getItem(APP_THEME_STORAGE_KEY), null);
  assert.equal(getAppThemePresetMatch(DEFAULT_APP_THEME), "default");
});

test("resolved stored theme falls back to the selected rose preset when active custom theme state is empty", () => {
  const storage = createStorageStub();

  writeStoredAppThemeSelection("rose", storage);

  assert.deepEqual(resolveStoredAppTheme(storage), ROSE_APP_THEME);
});

test("resolved stored theme prefers a selected preset over a stale saved theme blob", () => {
  const storage = createStorageStub();

  writeStoredAppTheme({
    ...TEST_APP_THEME,
    primaryActionColor: "#112233",
  }, storage);
  writeStoredAppThemeSelection("rose", storage);

  assert.deepEqual(resolveStoredAppTheme(storage), ROSE_APP_THEME);
  assert.equal(storage.getItem(APP_THEME_STORAGE_KEY), null);
});

test("stored non-default theme round-trips through storage", () => {
  const storage = createStorageStub();

  writeStoredAppTheme(TEST_APP_THEME, storage);
  const restoredTheme = readStoredAppTheme(storage);

  assert.deepEqual(restoredTheme, TEST_APP_THEME);
});

test("preset writes clear the stored custom theme blob for any preset match", () => {
  const storage = createStorageStub();

  writeStoredAppTheme(TEST_APP_THEME, storage);
  assert.notEqual(storage.getItem(APP_THEME_STORAGE_KEY), null);

  writeStoredAppTheme(ROSE_APP_THEME, storage);
  assert.equal(storage.getItem(APP_THEME_STORAGE_KEY), null);
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

test("theme storage helpers fail closed when browser storage throws", () => {
  const storage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {
      throw new Error("storage blocked");
    },
    removeItem() {
      throw new Error("storage blocked");
    },
  };

  assert.deepEqual(resolveStoredAppTheme(storage), DEFAULT_APP_THEME);
  assert.equal(readStoredAppThemeSelection(storage), null);
  assert.equal(readStoredAppTheme(storage), null);
  assert.doesNotThrow(() => writeStoredAppTheme(TEST_APP_THEME, storage));
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

  assert.deepEqual(getAppThemeSummary(ROSE_APP_THEME), {
    title: "Rose Circuit",
    detail: "Custom colors off",
    basePreset: "rose",
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
