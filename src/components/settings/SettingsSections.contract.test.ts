import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sectionsSource = readFileSync(fileURLToPath(new URL("./SettingsSectionsClient.tsx", import.meta.url)), "utf8");
const stateSource = readFileSync(fileURLToPath(new URL("./SettingsScreenState.tsx", import.meta.url)), "utf8");
const achievementsSource = readFileSync(fileURLToPath(new URL("./AccountAchievementsSection.tsx", import.meta.url)), "utf8");
const settingsPageSource = readFileSync(fileURLToPath(new URL("../../app/settings/page.tsx", import.meta.url)), "utf8");

test("Settings no longer carries a legacy migration section", () => {
  assert.doesNotMatch(stateSource, /"legacy"|SETTINGS_LEGACY_MIGRATION_ENABLED/);
  assert.doesNotMatch(sectionsSource, /LegacyMigrationSettings|Legacy & Migration|legacyBridgeConfigured|"legacy"/);
  assert.doesNotMatch(settingsPageSource, /SETTINGS_LEGACY_MIGRATION_ENABLED|legacyBridgeConfigured|"legacy"/);
});

test("Achievements moved to History > Progress: no Settings card, the old deep link redirects there", () => {
  assert.doesNotMatch(stateSource, /"achievements"/);
  assert.doesNotMatch(sectionsSource, /AccountAchievementsSection|case "achievements"|HistoryAchievement/);
  assert.match(sectionsSource, /<SettingsSectionCard section=\{section\} status=\{statusBySection\[section\]\} onToggle=\{\(\) => setExpandedSection\(section\)\} \/>/);
  assert.match(settingsPageSource, /if \(requestedSection === "achievements"\) \{\s+redirect\("\/history\/progression"\);/);
  assert.doesNotMatch(settingsPageSource, /loadHistorySessionsScopePayloadForUser|buildHistoryAchievements|achievements=\{/, "Settings no longer loads workout history");
  assert.match(achievementsSource, /data-account-achievements-section="true"/, "the section component stays: History > Progress renders it");
});

test("Account opens the shared account portal (account.fawxzzy.com); Sign out stays in the Settings body", () => {
  assert.match(sectionsSource, /SETTINGS_ACCOUNT_PORTAL_HREF = getFitnessAccountPortalUrl\("\/account", "\/settings"\)/);
  assert.match(sectionsSource, /href=\{SETTINGS_ACCOUNT_PORTAL_HREF\}/);
  assert.doesNotMatch(sectionsSource, /getAccountRouteHref/, "Settings no longer links to the in-app /account screen");
  assert.match(sectionsSource, /<SignOutButton placement="body" signedInAs=\{signedInAs\} \/>/);
  assert.doesNotMatch(sectionsSource, /useRouter/);
  assert.doesNotMatch(sectionsSource, /SettingsExternalTrigger/);
  assert.doesNotMatch(sectionsSource, /<PublishBottomActions>\s*<SignOutButton/);
  assert.doesNotMatch(sectionsSource, /expandedSection === "account" \? <AccountSettingsForm/);
});

test("Every deep-linkable section still opens: section keys, page resolver and the panel switch agree", () => {
  for (const section of ["account", "units", "pro", "data", "discord", "theme"]) {
    assert.match(stateSource, new RegExp(`"${section}"`));
    assert.match(settingsPageSource, new RegExp(`section === "${section}"`));
  }
  assert.match(sectionsSource, /expandedSection === "pro" \? <ProAccessSettings snapshot=\{proAccess\} billingNotice=\{billingNotice\} \/>/);
  assert.match(sectionsSource, /expandedSection === "units" \? <UnitsSettings saved=\{units\} action=\{unitsAction\} \/>/);
  assert.match(settingsPageSource, /units=\{readUnitsSettings\(profile\)\}/);
  assert.match(sectionsSource, /expandedSection === "theme" \? <AppThemeSettings \/>/);
  assert.match(sectionsSource, /expandedSection === "discord" \? <DiscordAccessSettings \/>/);
  assert.match(sectionsSource, /<DataSettingsSection\s+canAccessQaLlelUi=\{canAccessQaVisibilitySetting\}/);
});
