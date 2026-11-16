import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const screenSource = readFileSync(new URL("../../components/account/AccountScreen.tsx", import.meta.url), "utf8");
const settingsSource = readFileSync(new URL("../../components/settings/SettingsSectionsClient.tsx", import.meta.url), "utf8");
const settingsPageSource = readFileSync(new URL("../settings/page.tsx", import.meta.url), "utf8");
const signOutSource = readFileSync(new URL("../../components/SignOutButton.tsx", import.meta.url), "utf8");
const refreshSource = readFileSync(new URL("../../components/account/AccountPortalReturnRefresh.tsx", import.meta.url), "utf8");
const appNavSource = readFileSync(new URL("../../components/AppNav.tsx", import.meta.url), "utf8");

test("account route consumes the existing Fitness session and renders, never redirecting to the portal", () => {
  assert.match(pageSource, /requireUser\(\{/);
  assert.match(pageSource, /route: "\/account"/);
  assert.match(pageSource, /resolveAccountReturnHref/);
  assert.match(pageSource, /export const dynamic = "force-dynamic"/);
  // A direct visit shows the read-only screen; it is not a redirect (no dead route, no surprise host change).
  assert.doesNotMatch(pageSource, /redirect\(|getFitnessAccountPortalUrl|account\.fawxzzy\.com/);
});

test("account screen is read-only: identity rows link to the portal, no in-app edit or password form", () => {
  assert.match(screenSource, /ScrollScreenWithBottomActions/);
  assert.match(screenSource, /<ScreenHeader\s+kind="detail"\s+title="Account"/);
  assert.match(screenSource, /<ScreenHeaderBackButton href=\{returnHref\} historyBehavior="fallback-only" label="Back to Settings" \/>/);
  assert.doesNotMatch(screenSource, /TopRightBackButton|AppHeader|standaloneHeaderFamily|SettingsHeaderIdentity|<AppNav/);
  assert.match(screenSource, /title: "Username", value: username\.trim\(\)/);
  assert.match(screenSource, /title: "Email", value: email\.trim\(\)/);
  assert.match(screenSource, /title: "Password", value: ""/);
  assert.match(screenSource, /ACCOUNT_SCREEN_PORTAL_HREF = getFitnessAccountPortalUrl\("\/account", "\/settings"\)/);
  assert.match(screenSource, /kind: "link",\s+href: ACCOUNT_SCREEN_PORTAL_HREF/);
  assert.doesNotMatch(screenSource, /<form|<input|PasswordInput|AccountSettingsForm|AccountPasswordSection|updateAccountEmailAction|changePasswordAction/);
  assert.match(screenSource, /<AccountPortalReturnRefresh \/>/);
  assert.match(screenSource, /className="fx-account /);
  // The retired in-app forms are gone, not just unlinked.
  assert.equal(existsSync(new URL("../../components/settings/AccountSettingsForm.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../../components/settings/AccountPasswordSection.tsx", import.meta.url)), false);
  // Navigation still links to the portal; the Settings tab stays lit on /account.
  assert.match(settingsSource, /getFitnessAccountPortalUrl\("\/account", "\/settings"\)/);
  assert.match(appNavSource, /link\.href === "\/settings"/);
  assert.match(appNavSource, /activePathname === "\/account" \|\| activePathname\.startsWith\("\/account\/"\)/);
});

test("username and email are read back after a trip to the portal", () => {
  assert.match(refreshSource, /event\.persisted/);
  assert.match(refreshSource, /document\.visibilityState === "visible" && leftForPortal/);
  assert.match(refreshSource, /router\.refresh\(\)/);
  assert.match(settingsPageSource, /<AccountPortalReturnRefresh \/>/);
  assert.match(settingsPageSource, /<AuthenticatedRememberedLoginSync email=\{user\.email \?\? null\} displayName=\{username \|\| null\} \/>/);
  assert.match(settingsPageSource, /export const dynamic = "force-dynamic"/);
});

test("Sign out ends this device only: server revoke first, local sign-out, then ONE navigation, with a pending state", () => {
  assert.match(signOutSource, /clearPersistedWorkoutClientState\(\)/);
  assert.match(signOutSource, /fetch\("\/auth\/session-sync"/);
  assert.match(signOutSource, /method: "DELETE"/);
  assert.match(signOutSource, /auth\.signOut\(\{ scope: "local" \}\)/);
  assert.ok(signOutSource.indexOf('"/auth/session-sync"') < signOutSource.indexOf("signOut({ scope"));
  assert.equal((signOutSource.match(/window\.location\.assign\(/g) ?? []).length, 1);
  assert.doesNotMatch(signOutSource, /router\.(replace|push)\(/);
  assert.match(signOutSource, /isStandalone \? AUTH_ENTRY_PATH : getFitnessAccountSignOutUrl\(\)/);
  assert.match(signOutSource, /pending \? "Signing out…" : "Sign out"/);
  assert.match(signOutSource, /disabled=\{pending\}/);
  assert.doesNotMatch(signOutSource, /scope: "global"|"everywhere"/);
});

test("Sign out everywhere is a separate link to the portal Account page, set apart from Sign out", () => {
  assert.match(settingsSource, /SETTINGS_SIGN_OUT_EVERYWHERE_HREF = getFitnessSignOutEverywhereUrl\("\/settings"\)/);
  const actions = settingsSource.slice(settingsSource.indexOf("export function AccountSignOutActions"));
  assert.match(actions, /className="space-y-6 pt-2"/);
  const everywhereAt = actions.search(/>\s*Sign out everywhere\s*<\/a>/);
  assert.ok(everywhereAt > 0 && actions.indexOf("<SignOutButton") < everywhereAt);
  assert.match(actions, /<a\s+href=\{everywhereHref\}/);
  assert.match(screenSource, /<AccountSignOutActions everywhereHref=\{ACCOUNT_SCREEN_SIGN_OUT_EVERYWHERE_HREF\} \/>/);
});
