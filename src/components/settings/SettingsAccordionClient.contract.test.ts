import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const accordionSource = readFileSync(fileURLToPath(new URL("./SettingsAccordionClient.tsx", import.meta.url)), "utf8");
const stateSource = readFileSync(fileURLToPath(new URL("./SettingsScreenState.tsx", import.meta.url)), "utf8");
const achievementsSource = readFileSync(fileURLToPath(new URL("./AccountAchievementsSection.tsx", import.meta.url)), "utf8");
const settingsPageSource = readFileSync(fileURLToPath(new URL("../../app/settings/page.tsx", import.meta.url)), "utf8");

test("legacy migration settings stay compiled but hidden from the active Settings UI", () => {
  assert.match(stateSource, /SETTINGS_LEGACY_MIGRATION_ENABLED = false/);
  assert.match(accordionSource, /SETTINGS_LEGACY_MIGRATION_ENABLED \? \{ title: "Legacy & Migration" \} : null/);
  assert.match(accordionSource, /SETTINGS_LEGACY_MIGRATION_ENABLED && \(expandedSection === null \|\| expandedSection === "legacy"\)/);
});

test("Achievements use the Account accordion and remain deep-linkable", () => {
  assert.match(stateSource, /"achievements"/);
  assert.match(accordionSource, /case "achievements":\s*return \{ title: "Achievements" \}/);
  assert.match(accordionSource, /<SettingsAccordionTrigger\s+title="Achievements"/);
  assert.match(accordionSource, /<AccountAchievementsSection achievements=\{achievements\} \/>/);
  assert.match(settingsPageSource, /section === "achievements"/);
  assert.match(settingsPageSource, /loadHistorySessionsScopePayloadForUser/);
  assert.match(achievementsSource, /data-account-achievements-section="true"/);
  assert.match(achievementsSource, /appTokens\.settingsTwoColumnGrid/);
});

test("Account is an external portal button instead of an expandable settings form", () => {
  assert.match(accordionSource, /<SettingsExternalTrigger href=\{getFitnessAccountPortalUrl\(\)\} title="Account" \/>/);
  assert.doesNotMatch(accordionSource, /expandedSection === "account" \? <AccountSettingsForm/);
});
