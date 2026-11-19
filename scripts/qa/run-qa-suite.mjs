#!/usr/bin/env node
// One command for the scripts/qa proofs: `npm run qa:suite`.
//
//   stage 1 (always): every scripts/qa/*.test.* that needs no Supabase environment, through the Node test runner
//                     with the test alias loader. Deterministic, no network.
//   stage 2 (opt-in): the Playwright loopback browser proofs (auth surface parity, account same origin). They need
//                     a running Fitness dev server, so they run only when FITNESS_QA_BASE_URL is an explicit
//                     loopback origin (for example http://127.0.0.1:3002 from `npm run qa:dev`). Otherwise they are
//                     reported as SKIPPED, never as passed. `--require-browser` turns that skip into a failure.
//
// Tests that refuse to run without the local QA Supabase environment are listed in ENV_BOUND_TESTS and stay out of
// stage 1 on purpose (they are also excluded from `npm run test:all`).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QA_DIR = "scripts/qa";
const TEST_FILE_PATTERN = /\.test\.(ts|tsx|mjs|js)$/u;
const LOOPBACK_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/u;

export const ENV_BOUND_TESTS = ["scripts/qa/fitness-auth-state.test.mjs", "scripts/qa/zac-llel-routine.test.mjs"];

export const BROWSER_PROOFS = [
  { id: "auth-surface-parity", script: "scripts/qa/auth-surface-parity-proof.mjs", baseEnv: "FITNESS_AUTH_PARITY_BASE_URL", outputEnv: "FITNESS_AUTH_PARITY_OUTPUT" },
  { id: "account-same-origin", script: "scripts/qa/fitness-account-same-origin-proof.mjs", baseEnv: "FITNESS_ACCOUNT_PROOF_BASE_URL", outputEnv: "FITNESS_ACCOUNT_PROOF_OUTPUT" },
];

export function listHermeticQaTests(root = repoRoot) {
  return fs
    .readdirSync(path.join(root, QA_DIR))
    .filter((name) => TEST_FILE_PATTERN.test(name))
    .map((name) => `${QA_DIR}/${name}`)
    .filter((file) => !ENV_BOUND_TESTS.includes(file))
    .sort();
}

// Pure: decides what runs, from the test list and the environment. `outputRoot` is where browser proofs write
// artifacts; each proof gets its own new directory because the proofs refuse to reuse one.
export function buildQaPlan({ tests, env = {}, outputRoot, requireBrowser = false }) {
  const baseUrl = String(env.FITNESS_QA_BASE_URL ?? "").trim();
  const hermetic = { id: "hermetic-tests", kind: "node-test", files: tests, status: "run" };
  let browser;

  if (!baseUrl) {
    browser = { id: "browser-proofs", kind: "browser", status: "skipped", reason: "FITNESS_QA_BASE_URL is not set (start `npm run qa:dev` and set it to its loopback origin)", proofs: [] };
  } else if (!LOOPBACK_ORIGIN.test(baseUrl)) {
    browser = { id: "browser-proofs", kind: "browser", status: "invalid", reason: "FITNESS_QA_BASE_URL must be an explicit loopback origin like http://127.0.0.1:3002", proofs: [] };
  } else {
    browser = {
      id: "browser-proofs",
      kind: "browser",
      status: "run",
      proofs: BROWSER_PROOFS.map((proof) => ({
        id: proof.id,
        script: proof.script,
        outputEnv: proof.outputEnv,
        env: { [proof.baseEnv]: baseUrl, [proof.outputEnv]: path.join(outputRoot, proof.id) },
      })),
    };
  }

  const failedByPolicy = browser.status === "invalid" || (browser.status === "skipped" && requireBrowser);
  return { stages: [hermetic, browser], failedByPolicy };
}

function runNodeTests(files) {
  const result = spawnSync(
    process.execPath,
    ["--import", "./scripts/register-test-aliases.mjs", "--test", "--test-reporter=spec", ...files],
    { cwd: repoRoot, stdio: "inherit" },
  );
  return result.status === 0;
}

function runBrowserProof(proof) {
  const result = spawnSync(process.execPath, [proof.script], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...proof.env },
  });
  return result.status === 0;
}

function main(argv) {
  // Only create the artifact folder when browser proofs will actually run.
  const outputRoot = String(process.env.FITNESS_QA_BASE_URL ?? "").trim()
    ? fs.mkdtempSync(path.join(os.tmpdir(), "fitness-qa-suite-"))
    : os.tmpdir();
  const plan = buildQaPlan({ tests: listHermeticQaTests(), env: process.env, outputRoot, requireBrowser: argv.includes("--require-browser") });
  const summary = [];
  let failed = plan.failedByPolicy;

  for (const stage of plan.stages) {
    if (stage.status === "skipped" || stage.status === "invalid") {
      console.log(`[qa:suite] ${stage.id}: ${stage.status.toUpperCase()} - ${stage.reason}`);
      summary.push(`${stage.id}: ${stage.status.toUpperCase()}`);
      continue;
    }
    if (stage.kind === "node-test") {
      console.log(`[qa:suite] ${stage.id}: ${stage.files.length} files`);
      const ok = runNodeTests(stage.files);
      failed ||= !ok;
      summary.push(`${stage.id}: ${ok ? "PASS" : "FAIL"}`);
      continue;
    }
    for (const proof of stage.proofs) {
      console.log(`[qa:suite] browser proof ${proof.id} -> ${proof.env[proof.outputEnv]}`);
      const ok = runBrowserProof(proof);
      failed ||= !ok;
      summary.push(`${proof.id}: ${ok ? "PASS" : "FAIL"}`);
    }
  }

  console.log(`[qa:suite] ${summary.join(" | ")}`);
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
