import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(process.cwd());
const workflowPath = ".github/workflows/auth-design-system-contracts.yml";

function readWorkflow() {
  return fs.readFileSync(path.join(repoRoot, workflowPath), "utf8");
}

const GLOB_PATHS = [
  "src/app/login/**",
  "src/app/forgot-password/**",
  "src/app/reset-password/**",
  "truth-pack/fitness/design-system/**",
  "src/components/ui/app/**",
  "src/components/ui/workout-entry/**",
  "src/components/ui/measurements/**",
];

const LITERAL_PATHS = [
  "src/lib/local-dev-auto-entry.test.ts",
  "src/lib/local-dev-auto-login-credentials.ts",
  "src/lib/remembered-login.ts",
  "src/components/auth/authCopy.ts",
  "tests/design-system-contract.test.mjs",
  "truth-pack/fitness/README.md",
  "docs/design-system/FITNESS-DESIGN-SYSTEM.md",
  "src/components/SessionTimers.tsx",
  "src/components/routines/day-detail/DayDetailStateCard.tsx",
  "docs/PLAYBOOK_NOTES.md",
  ".github/workflows/auth-design-system-contracts.yml",
];

// This policy test's own file path is invoked directly by a run step (not
// via an npm script name, unlike the other two contract commands), so it
// legitimately appears a third time beyond the two trigger blocks.
const LITERAL_PATHS_ALSO_RUN = ["tests/auth-design-system-contracts-workflow.test.mjs"];

test("the dedicated auth/design-system workflow file exists and names its job", () => {
  const workflow = readWorkflow();
  assert.match(workflow, /^name: Auth and design-system contract proof/m);
  assert.match(workflow, /auth-design-system-contracts:\s*\n\s*runs-on: ubuntu-latest/);
});

test("pull_request and push-to-main both trigger the workflow", () => {
  const workflow = readWorkflow();
  assert.match(workflow, /on:\s*\n\s*pull_request:\s*\n\s*paths:/);
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]\s*\n\s*paths:/);
});

test("every glob dependency path is watched by both the pull_request and push triggers, with no broader substitute", () => {
  const workflow = readWorkflow();
  for (const glob of GLOB_PATHS) {
    const escaped = glob.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = workflow.match(new RegExp(escaped, "g"))?.length;
    assert.equal(count, 2, `${glob} must appear once per trigger block`);
  }
  assert.equal(workflow.includes('"src/app/**"'), false);
  assert.equal(workflow.includes('"src/**"'), false);
  assert.equal(workflow.includes('"src/components/**"'), false);
  assert.equal(workflow.includes('"truth-pack/**"'), false);
});

test("every literal dependency path is watched by both the pull_request and push triggers", () => {
  const workflow = readWorkflow();
  for (const literalPath of LITERAL_PATHS) {
    const escaped = literalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = workflow.match(new RegExp(escaped, "g"))?.length;
    assert.equal(count, 2, `${literalPath} must appear once per trigger block`);
  }
  for (const literalPath of LITERAL_PATHS_ALSO_RUN) {
    const escaped = literalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = workflow.match(new RegExp(escaped, "g"))?.length;
    assert.equal(
      count,
      3,
      `${literalPath} must appear once per trigger block plus its own run step`,
    );
  }
});

test("the workflow installs with npm ci and invokes both contract commands directly", () => {
  const workflow = readWorkflow();
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run test:auth-ui-contracts/);
  assert.match(workflow, /run: npm run test:design-system-contract/);
});

test("the workflow stays read-only, single-job, and has no dispatch, secrets, or deploy step", () => {
  const workflow = readWorkflow();
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.equal(workflow.includes("contents: write"), false);
  assert.equal((workflow.match(/runs-on:/g) ?? []).length, 1);
  assert.equal(workflow.includes("workflow_dispatch"), false);
  assert.equal(workflow.includes("secrets."), false);
  assert.equal(/deploy/i.test(workflow), false);
});
