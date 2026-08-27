import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local development auto-login stays explicit while normal login enters the shared Fitness portal", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /const shouldAttemptLocalDevAutoLogin = searchParams\?\.localAutoAuth === "1"/);
  assert.match(source, /return <LocalDevAutoLoginRedirect href=\{href\} \/>;/);
  assert.match(source, /redirect\(getFitnessAccountPortalUrl\("\/login"\)\)/);
  assert.doesNotMatch(source, /<LoginScreen/);
  assert.doesNotMatch(source, /manual !== "1" && searchParams\?\.localAutoAuth !== "failed"/);
});

test("legacy Home Screen launches bypass the session-clearing login screen", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /searchParams\?\.installedApp === "1"/);
  assert.match(source, /redirect\("\/entry\?installedApp=1"\)/);
  assert.match(source, /!searchParams\?\.error/);
  assert.match(source, /!returnTo/);
  assert.match(source, /!shouldAttemptLocalDevAutoLogin/);
});
