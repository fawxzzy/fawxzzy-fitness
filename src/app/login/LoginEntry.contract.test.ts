import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("login entry sends browser tabs to the portal and keeps installed apps on the canonical Fitness auth screen", async () => {
  const source = await readFile(new URL("./LoginEntry.tsx", import.meta.url), "utf8");
  const redirectSource = await readFile(new URL("./AccountPortalRedirect.tsx", import.meta.url), "utf8");

  assert.match(source, /props\.manualRequested && isTrustedLocalDevHost\(window\.location\.hostname\)/);
  assert.match(source, /getInstallContext\(\)\.isStandalone \|\| isLocalManualLogin/);
  assert.match(source, /displayMode === "browser"/);
  assert.match(source, /getFitnessLoginPortalUrl\(props\.returnTo\)/);
  assert.match(source, /return <LoginScreen \{\.\.\.props\} \/>/);
  assert.match(redirectSource, /window\.location\.replace\(href\)/);
  assert.doesNotMatch(redirectSource, /clearBrowserSupabaseSession|session-sync|accessToken|refreshToken/);
});
