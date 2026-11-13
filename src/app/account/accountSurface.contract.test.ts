import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const screenSource = readFileSync(new URL("../../components/account/AccountScreen.tsx", import.meta.url), "utf8");
const settingsSource = readFileSync(new URL("../../components/settings/SettingsSectionsClient.tsx", import.meta.url), "utf8");
const signOutSource = readFileSync(new URL("../../components/SignOutButton.tsx", import.meta.url), "utf8");
const appNavSource = readFileSync(new URL("../../components/AppNav.tsx", import.meta.url), "utf8");

test("account route consumes the existing Fitness session and never redirects to the external portal", () => {
  assert.match(pageSource, /requireUser\(\{/);
  assert.match(pageSource, /route: "\/account"/);
  assert.match(pageSource, /resolveAccountReturnHref/);
  assert.doesNotMatch(pageSource, /getFitnessAccountPortalUrl|account\.fawxzzy\.com/);
});

test("account screen reuses the established mobile shell, account form, and deterministic back control", () => {
  assert.match(screenSource, /ScrollScreenWithBottomActions/);
  assert.match(screenSource, /<AccountSettingsForm email=\{email\} username=\{username\} \/>/);
  assert.match(screenSource, /<TopRightBackButton/);
  assert.match(screenSource, /historyBehavior="fallback-only"/);
  assert.match(screenSource, /ariaLabel="Back to Settings"/);
  assert.match(settingsSource, /getAccountRouteHref\("\/settings"\)/);
  assert.match(appNavSource, /link\.href === "\/settings"/);
  assert.match(appNavSource, /activePathname === "\/account" \|\| activePathname\.startsWith\("\/account\/"\)/);
  assert.match(screenSource, /activePathnameOverride=\{activePathnameOverride\}/);
});

test("the local account surface retains validated sign-out cleanup", () => {
  assert.match(signOutSource, /clearPersistedWorkoutClientState\(\)/);
  assert.match(signOutSource, /supabase\.auth\.signOut\(\)/);
  assert.match(signOutSource, /fetch\("\/auth\/session-sync"/);
  assert.match(signOutSource, /method: "DELETE"/);
  assert.match(signOutSource, /router\.replace\(AUTH_ENTRY_PATH\)/);
});

test("change password sits on the Account screen with the shared password field, policy, and its own submit", () => {
  const sectionSource = readFileSync(new URL("../../components/settings/AccountPasswordSection.tsx", import.meta.url), "utf8");
  const actionsSource = readFileSync(new URL("../settings/actions.ts", import.meta.url), "utf8");

  assert.match(screenSource, /<AccountPasswordSection email=\{email\} \/>/);
  assert.match(sectionSource, /changePasswordAction/);
  assert.match(sectionSource, /validateChangePasswordInput/);
  assert.equal((sectionSource.match(/<PasswordInput/g) ?? []).length, 3);
  assert.match(sectionSource, /autoComplete="current-password"/);
  assert.equal((sectionSource.match(/autoComplete="new-password"/g) ?? []).length, 2);
  assert.equal((sectionSource.match(/minLength=\{NEW_PASSWORD_MINIMUM\}/g) ?? []).length, 2);
  assert.doesNotMatch(sectionSource, /maxLength=/);
  // The Account dock stays Sign out + Save; the password form owns its own submit.
  assert.doesNotMatch(sectionSource, /PublishBottomActions|BottomDockButton/);
  assert.match(sectionSource, /type="submit"/);

  // The write runs on a client that holds a session, never on the request-bound client (no stored session there).
  const action = actionsSource.slice(actionsSource.indexOf("export async function changePasswordAction"), actionsSource.indexOf("export async function updateUnitPreferencesAction"));
  assert.match(action, /signInWithPassword\(\{ email, password: input\.current \}\)/);
  assert.match(action, /auth\.updateUser\(\{ password: input\.next \}\)/);
  assert.match(action, /signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(action, /supabaseServerWithSession|supabaseServer\(/);
  assert.doesNotMatch(action, /error\.message/);
});
