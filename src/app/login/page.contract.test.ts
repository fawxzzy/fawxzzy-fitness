import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("normal Fitness login delegates browser-versus-installed routing to the shared account entry", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /const shouldAttemptLocalDevAutoLogin = searchParams\?\.localAutoAuth === "1"/);
  assert.match(source, /return <LocalDevAutoLoginRedirect href=\{href\} \/>;/);
  assert.match(source, /<LoginEntry/);
  assert.match(source, /returnTo=\{returnTo\}/);
  assert.doesNotMatch(source, /<LoginScreen/);
});

test("legacy Home Screen launches bypass the session-clearing login screen", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /searchParams\?\.installedApp === "1"/);
  assert.match(source, /redirect\("\/entry\?installedApp=1"\)/);
  assert.match(source, /!searchParams\?\.error/);
  assert.match(source, /!returnTo/);
  assert.match(source, /!shouldAttemptLocalDevAutoLogin/);
});
