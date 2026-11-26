import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { ToastProvider } from "../components/ui/ToastProvider.tsx";
import { UnitsSettings } from "../components/settings/UnitsSettings.tsx";
import { SettingsSectionCard } from "../components/settings/SettingsSectionsClient.tsx";
import {
  buildTimeZoneOptions,
  formatTimeZoneLabel,
  formatUnitsSettingsStatus,
  guessDeviceUnits,
  isUntouchedUnitsProfile,
  parseUnitsSettingsForm,
  readUnitsSettings,
  resolveUnitsSettingsPreset,
  UNITS_SETTINGS_DEFAULTS,
} from "./units-settings.ts";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("readUnitsSettings keeps saved values and falls back to the defaults for anything unexpected", () => {
  assert.deepEqual(
    readUnitsSettings({ preferred_weight_unit: "kg", preferred_distance_unit: "km", timezone: "Europe/London" }),
    { weightUnit: "kg", distanceUnit: "km", timeZone: "Europe/London" },
  );
  assert.deepEqual(readUnitsSettings({ preferred_weight_unit: "stone", preferred_distance_unit: null, timezone: "Mars/Olympus" }), UNITS_SETTINGS_DEFAULTS);
});

test("the form accepts lbs|kg, mi|km and a real IANA zone; errors are plain sentences", () => {
  assert.deepEqual(parseUnitsSettingsForm(form({ weightUnit: "kg", distanceUnit: "km", timeZone: " Asia/Tokyo " })), {
    ok: true,
    values: { weightUnit: "kg", distanceUnit: "km", timeZone: "Asia/Tokyo" },
  });
  assert.deepEqual(parseUnitsSettingsForm(form({ weightUnit: "lb", distanceUnit: "km", timeZone: "UTC" })), { ok: false, error: "Pick lb or kg for weight." });
  assert.deepEqual(parseUnitsSettingsForm(form({ weightUnit: "kg", distanceUnit: "miles", timeZone: "UTC" })), { ok: false, error: "Pick mi or km for distance." });
  assert.deepEqual(parseUnitsSettingsForm(form({ weightUnit: "kg", distanceUnit: "km", timeZone: "Mars/Olympus" })), { ok: false, error: "Pick a time zone from the list." });
  assert.equal(parseUnitsSettingsForm(form({ weightUnit: "kg", distanceUnit: "km" })).ok, false);
});

test("device guess: zone from Intl, units from the locale region (US lb/mi, UK kg/mi, elsewhere kg/km)", () => {
  assert.deepEqual(guessDeviceUnits({ timeZone: "America/Los_Angeles", locale: "en-US" }), { timeZone: "America/Los_Angeles", weightUnit: "lbs", distanceUnit: "mi" });
  assert.deepEqual(guessDeviceUnits({ timeZone: "Europe/London", locale: "en-GB" }), { timeZone: "Europe/London", weightUnit: "kg", distanceUnit: "mi" });
  assert.deepEqual(guessDeviceUnits({ timeZone: "Europe/Berlin", locale: "de" }), { timeZone: "Europe/Berlin", weightUnit: "kg", distanceUnit: "km" });
  assert.deepEqual(guessDeviceUnits({ timeZone: "Nope/Nowhere", locale: null }), {});
});

test("the device preset applies only while the profile still holds a new account's values", () => {
  assert.equal(isUntouchedUnitsProfile(UNITS_SETTINGS_DEFAULTS), true);
  assert.equal(isUntouchedUnitsProfile({ ...UNITS_SETTINGS_DEFAULTS, timeZone: "America/Toronto" }), true, "DB column default");
  assert.equal(isUntouchedUnitsProfile({ ...UNITS_SETTINGS_DEFAULTS, timeZone: "UTC" }), true, "old server-runtime capture");
  assert.equal(isUntouchedUnitsProfile({ ...UNITS_SETTINGS_DEFAULTS, weightUnit: "kg" }), false);

  const fresh = resolveUnitsSettingsPreset(UNITS_SETTINGS_DEFAULTS, { timeZone: "Europe/Berlin", locale: "de-DE" });
  assert.deepEqual(fresh, { values: { weightUnit: "kg", distanceUnit: "km", timeZone: "Europe/Berlin" }, fromDevice: true });

  const sameAsDevice = resolveUnitsSettingsPreset(UNITS_SETTINGS_DEFAULTS, { timeZone: "America/New_York", locale: "en-US" });
  assert.equal(sameAsDevice.fromDevice, false, "nothing to suggest: the form is already saved");

  const chosen = { weightUnit: "kg" as const, distanceUnit: "mi" as const, timeZone: "America/Chicago" };
  assert.deepEqual(resolveUnitsSettingsPreset(chosen, { timeZone: "Asia/Tokyo", locale: "ja-JP" }), { values: chosen, fromDevice: false }, "a chosen value is never overwritten");
});

test("labels: 'lb · mi' status chip, readable zone names, presets first with no duplicates", () => {
  assert.equal(formatUnitsSettingsStatus(UNITS_SETTINGS_DEFAULTS), "lb · mi");
  assert.equal(formatUnitsSettingsStatus({ weightUnit: "kg", distanceUnit: "km" }), "kg · km");
  assert.equal(formatTimeZoneLabel("America/New_York"), "Eastern (New York)");
  assert.equal(formatTimeZoneLabel("America/Argentina/Buenos_Aires"), "Buenos Aires (America / Argentina)");
  assert.equal(formatTimeZoneLabel("UTC"), "UTC");

  const options = buildTimeZoneOptions({ current: "Europe/London", device: "Asia/Tokyo", all: ["Asia/Tokyo", "Europe/London", "Europe/Paris", "UTC"] });
  assert.deepEqual(options.common.map((option) => option.value), ["Europe/London", "Asia/Tokyo", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "UTC"]);
  assert.deepEqual(options.all.map((option) => option.value), ["Europe/Paris"]);
});

test("the panel: lb/kg and mi/km segments, a labelled time zone select, one Save, no inline red text", () => {
  const html = renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <ToastProvider>
        <UnitsSettings saved={{ weightUnit: "kg", distanceUnit: "km", timeZone: "Europe/London" }} action={async () => ({ ok: true })} />
      </ToastProvider>
    </AppRouterContext.Provider>,
  );
  assert.match(html, /<h3[^>]*>Your defaults<\/h3>/);
  assert.match(html, /aria-label="Weight unit"/);
  assert.match(html, /aria-label="Distance unit"/);
  assert.match(html, /aria-selected="true"[^>]*>kg</);
  assert.match(html, /aria-selected="true"[^>]*>km</);
  const label = html.match(/<label[^>]*for="([^"]+)"[^>]*>Time zone<\/label>/);
  assert.ok(label, "the select is named by its visible label");
  assert.match(html, new RegExp(`<select[^>]*id="${label[1]}"`));
  assert.match(html, /<option value="Europe\/London" selected="">London \(Europe\)<\/option>/);
  assert.match(html, /Routines you already made keep their own time zone\./);
  assert.match(html, /disabled=""[^>]*>[\s\S]*?Saved/, "nothing changed yet: Save is quiet and disabled");
  assert.doesNotMatch(html, /text-\[rgb\(var\(--danger/);

  const card = renderToStaticMarkup(<SettingsSectionCard section="units" status="lb · mi" onToggle={() => {}} />);
  assert.match(card, /<h2[^>]*>Units &amp; time zone<\/h2>/);
  assert.match(card, /Weight, distance and time zone/);
  assert.match(card, /lb · mi/);
});

test("the save action validates first, writes only existing profile columns, and refreshes Settings, Today and History", () => {
  const action = readFileSync(new URL("../app/settings/units-actions.ts", import.meta.url), "utf8");
  assert.match(action, /^"use server";/);
  assert.match(action, /const parsed = parseUnitsSettingsForm\(formData\);\s+if \(!parsed\.ok\) \{\s+return parsed;/);
  assert.match(action, /\.from\("profiles"\)\s+\.update\(\{\s+preferred_weight_unit: parsed\.values\.weightUnit,\s+preferred_distance_unit: parsed\.values\.distanceUnit,\s+timezone: parsed\.values\.timeZone,\s+\}\)\s+\.eq\("id", user\.id\)/);
  for (const path of ["/settings", "/today", "/history"]) {
    assert.match(action, new RegExp(`revalidatePath\\("${path}"\\)`));
  }
  assert.doesNotMatch(action, /from\("routines"\)/, "routines keep their own zone and units");
  assert.equal((action.match(/\.from\(/g) ?? []).length, 1, "one write, to the signed-in profile only");
});
