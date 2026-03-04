import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectChecks, parseArgs, printReport } from './cli.mjs';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-doctor-'));
}

test('parseArgs supports --cwd and --strict', () => {
  const parsed = parseArgs(['--cwd=./docs', '--strict']);
  assert.equal(parsed.strict, true);
  assert.equal(path.isAbsolute(parsed.cwd), true);
});

test('doctor reports FAIL when required scripts and files are missing', () => {
  const repo = makeTempRepo();
  fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }, null, 2));

  const report = collectChecks(repo);
  const statuses = Object.fromEntries(report.checks.map((check) => [check.name, check.status]));
  assert.equal(statuses['script-playbook'], 'FAIL');
  assert.equal(statuses['status-file'], 'FAIL');
  assert.equal(printReport(report), 1);
});
