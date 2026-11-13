import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("signup entry sends browser tabs to the one portal sign-up surface and keeps installed apps on the in-app screen", async () => {
  const source = await readFile(new URL("./SignupEntry.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("./layout.tsx", import.meta.url), "utf8");
  const redirectSource = await readFile(new URL("../login/AccountPortalRedirect.tsx", import.meta.url), "utf8");

  assert.match(layout, /<SignupEntry>\{children\}<\/SignupEntry>/);
  assert.match(source, /getInstallContext\(\)\.isStandalone \|\| isLocalManualSignup/);
  assert.match(source, /params\.get\("manual"\) === "1" && isTrustedLocalDevHost\(window\.location\.hostname\)/);
  assert.match(source, /state\.mode === "browser"/);
  assert.match(source, /<AccountPortalRedirect href=\{state\.portalHref\} \/>/);
  assert.match(source, /portalHref: getFitnessSignupPortalUrlForSearch\(window\.location\.search\)/);
  assert.match(source, /return <>\{children\}<\/>/);
  // Return targets are narrowed in getFitnessSignupPortalUrlForSearch (behaviour-tested in account-portal.test.ts).
  // No source-origin session cleanup on departure (same as the /login redirect): the broker handoff replaces the
  // Fitness cookies on a completed sign-in, and clearing would sign a member out for opening Create account.
  assert.doesNotMatch(source, /clearBrowserSupabaseSession|session-sync|accessToken|refreshToken/);
  assert.match(redirectSource, /window\.location\.replace\(href\)/);
});

test("the sign-up page itself stays the in-app screen and does not import the portal helpers", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /getFitnessSignupPortalUrl|account\.fawxzzy\.com|SignupEntry/);
  assert.match(page, /<SignupForm/);
});
