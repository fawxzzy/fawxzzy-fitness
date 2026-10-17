import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = "scripts/process-fitness-followups-exact.mjs";
const safeEnv = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "TEMP", "TMP"].filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);

test("focused CI watches the exact runner and stats source on PRs and main pushes", () => {
  const workflow = readFileSync(path.join(repoRoot, ".github/workflows/fitness-integrity-completion-contract.yml"), "utf8");
  const [pullRequest, mainPush] = workflow.split(/^  push:\s*$/m);
  assert.ok(pullRequest && mainPush, "both workflow triggers remain inspectable");
  for (const section of [pullRequest, mainPush]) {
    for (const sourcePath of [
      "scripts/process-fitness-followups-exact.mjs",
      "scripts/process-fitness-followups-exact.test.mjs",
      "scripts/test-alias-loader.mjs",
      "src/lib/exercise-stats.ts",
      "src/lib/exercise-stats.test.ts",
      "src/lib/ecosystem/fitness-integration-server.ts",
      "src/lib/ecosystem/fitness-integration-server.test.ts",
      "src/lib/session-follow-up-jobs.ts",
      "src/lib/session-follow-up-jobs.test.ts",
    ]) {
      assert.ok(section.includes(`- "${sourcePath}"`), `${sourcePath} must trigger the focused workflow`);
    }
  }
});

test("exact follow-up runner preflight proves its packaged alias loader without provider access", () => {
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/register-test-aliases.mjs", runner, "--preflight-runtime",
  ], { cwd: repoRoot, env: safeEnv, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "EXACT_FOLLOW_UP_RUNTIME_READY");
  assert.equal(result.stderr, "");
});

test("exact follow-up runner rejects a missing alias loader before credentials or a claim", () => {
  const result = spawnSync(process.execPath, [runner, "--preflight-runtime"], {
    cwd: repoRoot, env: safeEnv, encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "EXACT_FOLLOW_UP_RUNTIME_ALIAS_HOLD");
});

test("exact follow-up runner rejects an unpinned timestamp before provider access", () => {
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/register-test-aliases.mjs", runner,
    "--execute-exact-incident", "2026-10-17T03:09:55Z",
  ], { cwd: repoRoot, env: safeEnv, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "EXACT_FOLLOW_UP_PRECLAIM_HOLD");
});
