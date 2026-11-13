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

test("Achievements are a Settings section card and remain deep-linkable", () => {
  assert.match(stateSource, /"achievements"/);
  assert.match(sectionsSource, /case "achievements":\s*return \{ title: "Achievements"/);
  assert.match(sectionsSource, /<AccountAchievementsSection achievements=\{achievements\} \/>/);
  assert.match(sectionsSource, /<SettingsSectionCard section=\{section\} onToggle=\{\(\) => setExpandedSection\(section\)\} \/>/);
  assert.match(settingsPageSource, /section === "achievements"/);
  assert.match(settingsPageSource, /loadHistorySessionsScopePayloadForUser/);
  assert.match(achievementsSource, /data-account-achievements-section="true"/);
});

test("Account opens the same-origin Fitness account route instead of an external portal", () => {
  assert.match(sectionsSource, /router\.push\(getAccountRouteHref\("\/settings"\)\)/);
  assert.match(sectionsSource, /import \{ useRouter \} from "next\/navigation"/);
  assert.doesNotMatch(sectionsSource, /getFitnessAccountPortalUrl|SettingsExternalTrigger/);
  assert.doesNotMatch(sectionsSource, /<PublishBottomActions>\s*<SignOutButton/);
  assert.doesNotMatch(sectionsSource, /expandedSection === "account" \? <AccountSettingsForm/);
});

test("Every deep-linkable section still opens: section keys, page resolver and the panel switch agree", () => {
  for (const section of ["account", "achievements", "pro", "data", "discord", "theme"]) {
    assert.match(stateSource, new RegExp(`"${section}"`));
    assert.match(settingsPageSource, new RegExp(`section === "${section}"`));
  }
  assert.match(sectionsSource, /expandedSection === "pro" \? <ProAccessSettings snapshot=\{proAccess\} billingNotice=\{billingNotice\} \/>/);
  assert.match(sectionsSource, /expandedSection === "theme" \? <AppThemeSettings \/>/);
  assert.match(sectionsSource, /expandedSection === "discord" \? <DiscordAccessSettings \/>/);
  assert.match(sectionsSource, /<DataSettingsSection\s+canAccessQaLlelUi=\{canAccessQaVisibilitySetting\}/);
});
