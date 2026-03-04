import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseContractAuditRules, runContractsAudit } from './index.mjs';

function writeFixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-contract-rules-'));
  fs.mkdirSync(path.join(root, 'docs/CONTRACTS'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  return root;
}

test('parseContractAuditRules parses strict v1 section', () => {
  const rules = parseContractAuditRules(`## Audit Rules (v1)\n- Target globs: [\"src/**/*.ts\"]\n- Forbidden regex: [\"console\\\\.log\"]\n- Required regex: [\"export\"]\n- Allowlist globs: [\"**/*.test.ts\"]\n`);

  assert.deepEqual(rules, {
    targetGlobs: ['src/**/*.ts'],
    forbiddenRegex: ['console\\.log'],
    requiredRegex: ['export'],
    allowlistGlobs: ['**/*.test.ts']
  });
});

test('generated doc rules override handwritten check and include violation line numbers', () => {
  const root = writeFixtureRepo();
  fs.writeFileSync(
    path.join(root, 'docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md'),
    '# SAFE_AREA_OWNERSHIP\n\n## Audit Rules (v1)\n- Target globs: ["src/**/*.tsx"]\n- Forbidden regex: ["safe-area-inset-bottom"]\n'
  );
  fs.writeFileSync(path.join(root, 'docs/CONTRACTS/SERVER_CLIENT_BOUNDARY.md'), '# SERVER_CLIENT_BOUNDARY\n');
  fs.writeFileSync(path.join(root, 'docs/CONTRACTS/SINGLE_SCROLL_OWNER.md'), '# SINGLE_SCROLL_OWNER\n');
  fs.writeFileSync(path.join(root, 'docs/CONTRACTS/BOTTOM_ACTIONS_OWNERSHIP.md'), '# BOTTOM_ACTIONS_OWNERSHIP\n');
  fs.writeFileSync(path.join(root, 'src/view.tsx'), '<main>\n  safe-area-inset-bottom\n</main>\n');

  const report = runContractsAudit({ cwd: root });
  const generated = report.checks.find((item) => item.contract === 'SAFE_AREA_OWNERSHIP' && item.message.includes('Audit Rules (v1)'));
  assert.equal(generated.status, 'FAIL');
  assert.match(generated.message, /src\/view\.tsx:2/);
  assert.equal(generated.violations[0].line, 2);
  assert.equal(report.summary.fail >= 1, true);
  assert.equal(Array.isArray(report.byContract), true);
});
