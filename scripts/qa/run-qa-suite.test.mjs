import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { BROWSER_PROOFS, ENV_BOUND_TESTS, buildQaPlan, listHermeticQaTests } from "./run-qa-suite.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = path.resolve(repoRoot, "tmp-qa-suite-output");

test("hermetic list is every scripts/qa test minus the named env-bound ones", () => {
  const all = fs
    .readdirSync(path.join(repoRoot, "scripts", "qa"))
    .filter((name) => /\.test\.(ts|tsx|mjs|js)$/u.test(name))
    .map((name) => `scripts/qa/${name}`);
  const hermetic = listHermeticQaTests();
  assert.ok(hermetic.includes("scripts/qa/fitness-auth-handoff-loopback.test.ts"));
  assert.ok(hermetic.includes("scripts/qa/run-qa-suite.test.mjs"));
  for (const file of ENV_BOUND_TESTS) {
    assert.ok(all.includes(file), `${file} is listed as env-bound but is not a qa test`);
    assert.ok(!hermetic.includes(file));
  }
  assert.equal(hermetic.length + ENV_BOUND_TESTS.length, all.length);
});

test("every browser proof script exists", () => {
  for (const proof of BROWSER_PROOFS) {
    assert.ok(fs.existsSync(path.join(repoRoot, proof.script)), `${proof.script} is missing`);
  }
});

test("without a base URL the browser proofs are SKIPPED, not passed, and only --require-browser fails the run", () => {
  const relaxed = buildQaPlan({ tests: ["a.test.mjs"], env: {}, outputRoot });
  assert.equal(relaxed.stages[1].status, "skipped");
  assert.deepEqual(relaxed.stages[1].proofs, []);
  assert.equal(relaxed.failedByPolicy, false);

  const strict = buildQaPlan({ tests: ["a.test.mjs"], env: {}, outputRoot, requireBrowser: true });
  assert.equal(strict.failedByPolicy, true);
});

test("a non-loopback base URL is rejected", () => {
  const plan = buildQaPlan({ tests: [], env: { FITNESS_QA_BASE_URL: "https://fitness.fawxzzy.com" }, outputRoot });
  assert.equal(plan.stages[1].status, "invalid");
  assert.equal(plan.failedByPolicy, true);
});

test("a loopback base URL maps onto each proof's own env names with its own output directory", () => {
  const plan = buildQaPlan({ tests: [], env: { FITNESS_QA_BASE_URL: "http://127.0.0.1:3002" }, outputRoot });
  const browser = plan.stages[1];
  assert.equal(browser.status, "run");
  assert.equal(browser.proofs.length, BROWSER_PROOFS.length);
  const outputs = new Set();
  for (const proof of browser.proofs) {
    const def = BROWSER_PROOFS.find((candidate) => candidate.id === proof.id);
    assert.equal(proof.env[def.baseEnv], "http://127.0.0.1:3002");
    assert.ok(path.isAbsolute(proof.env[def.outputEnv]));
    outputs.add(proof.env[def.outputEnv]);
  }
  assert.equal(outputs.size, BROWSER_PROOFS.length, "each proof needs its own new output directory");
});
