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

test("exact runner accepts only the canonical HTTPS master origin before provider access", () => {
  for (const url of [
    "https://bxtcuhkotumitoqtrcej.supabase.co",
    "https://bxtcuhkotumitoqtrcej.supabase.co/",
  ]) {
    const result = spawnSync(process.execPath, [
      "--import", "./scripts/register-test-aliases.mjs", runner, "--preflight-target",
    ], { cwd: repoRoot, env: { ...safeEnv, NEXT_PUBLIC_SUPABASE_URL: url }, encoding: "utf8" });
    assert.equal(result.status, 0, `${url}: ${result.stderr}`);
    assert.equal(result.stdout, "EXACT_FOLLOW_UP_TARGET_READY\n");
    assert.equal(result.stderr, "");
  }
});

test("exact runner rejects noncanonical master URLs before provider access", () => {
  for (const url of [
    "http://bxtcuhkotumitoqtrcej.supabase.co",
    "https://user:pass@bxtcuhkotumitoqtrcej.supabase.co",
    "https://bxtcuhkotumitoqtrcej.supabase.co:8443",
    "https://bxtcuhkotumitoqtrcej.supabase.co:443",
    "https://bxtcuhkotumitoqtrcej.supabase.co/rest/v1",
    "https://bxtcuhkotumitoqtrcej.supabase.co?x=1",
    "https://bxtcuhkotumitoqtrcej.supabase.co#fragment",
    "https://bxtcuhkotumitoqtrcej.supabase.co.",
    "https://other.supabase.co",
    "HTTPS://bxtcuhkotumitoqtrcej.supabase.co",
    "not-a-url",
    "",
  ]) {
    const result = spawnSync(process.execPath, [
      "--import", "./scripts/register-test-aliases.mjs", runner, "--preflight-target",
    ], { cwd: repoRoot, env: { ...safeEnv, NEXT_PUBLIC_SUPABASE_URL: url }, encoding: "utf8" });
    assert.equal(result.status, 1, url);
    assert.equal(result.stdout, "", url);
    assert.equal(result.stderr, "EXACT_FOLLOW_UP_PRECLAIM_HOLD\n", url);
  }
});

test("exact incident path rejects an HTTP master URL before reading a credential or claiming a job", () => {
  const fixture = "synthetic-unused-credential\n";
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/register-test-aliases.mjs", runner,
    "--execute-exact-incident", "2026-10-17T03:09:55.111465Z",
  ], {
    cwd: repoRoot,
    env: {
      ...safeEnv,
      FITNESS_EXACT_FOLLOWUP_CREDENTIAL_PIPE: "1",
      NEXT_PUBLIC_SUPABASE_URL: "http://bxtcuhkotumitoqtrcej.supabase.co",
    },
    input: fixture,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "EXACT_FOLLOW_UP_PRECLAIM_HOLD\n");
  assert.ok(!`${result.stdout}${result.stderr}`.includes(fixture.trim()));
});

test("exact runner accepts a bounded synthetic credential through stdin without echo", () => {
  const fixture = "synthetic-fixture-key\n";
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/register-test-aliases.mjs", runner, "--preflight-credential-pipe",
  ], { cwd: repoRoot, env: { ...safeEnv, FITNESS_EXACT_FOLLOWUP_CREDENTIAL_PIPE: "1" }, input: fixture, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "EXACT_FOLLOW_UP_CREDENTIAL_PIPE_READY");
  assert.equal(result.stderr, "");
  assert.ok(!`${result.stdout}${result.stderr}`.includes(fixture.trim()));
});

test("documented npm runner forwards a synthetic credential pipe", () => {
  const command = "npm run fitness:followups:process:exact -- --preflight-credential-pipe";
  const executable = process.platform === "win32" ? "cmd.exe" : "sh";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-c", command];
  const result = spawnSync(executable, args, {
    cwd: repoRoot,
    env: { ...safeEnv, FITNESS_EXACT_FOLLOWUP_CREDENTIAL_PIPE: "1" },
    input: "synthetic-npm-credential\n",
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /EXACT_FOLLOW_UP_CREDENTIAL_PIPE_READY/);
  assert.ok(!`${result.stdout}${result.stderr}`.includes("synthetic-npm-credential"));
});

test("exact runner rejects ambiguous, oversized, and absent pipe credentials", () => {
  const cases = [
    { input: "synthetic-fixture-key\n", env: { SUPABASE_SERVICE_ROLE_KEY: "other-fixture" } },
    { input: "x".repeat(4097), env: {} },
    { input: "", env: {} },
  ];
  for (const entry of cases) {
    const result = spawnSync(process.execPath, [
      "--import", "./scripts/register-test-aliases.mjs", runner, "--preflight-credential-pipe",
    ], { cwd: repoRoot, env: { ...safeEnv, FITNESS_EXACT_FOLLOWUP_CREDENTIAL_PIPE: "1", ...entry.env }, input: entry.input, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "EXACT_FOLLOW_UP_PRECLAIM_HOLD\n");
    assert.ok(!`${result.stdout}${result.stderr}`.includes("synthetic-fixture-key"));
  }
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
