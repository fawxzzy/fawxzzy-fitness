#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_PATHS = [
  { key: 'playbookDir', target: 'Playbook', label: 'Playbook/ directory', type: 'dir' },
  { key: 'projectGovernance', target: 'docs/PROJECT_GOVERNANCE.md', label: 'docs/PROJECT_GOVERNANCE.md', type: 'file' },
  { key: 'playbookNotes', target: 'docs/PLAYBOOK_NOTES.md', label: 'docs/PLAYBOOK_NOTES.md', type: 'file' },
  { key: 'changelog', target: 'docs/CHANGELOG.md', label: 'docs/CHANGELOG.md', type: 'file' },
  { key: 'playbookStatus', target: 'docs/playbook-status.json', label: 'docs/playbook-status.json', type: 'json' },
  { key: 'statusScript', target: 'scripts/playbook/status.mjs', label: 'scripts/playbook/status.mjs', type: 'file' },
  { key: 'autoScript', target: 'scripts/playbook/auto.mjs', label: 'scripts/playbook/auto.mjs', type: 'file' },
  { key: 'playbookCommandScript', target: 'scripts/playbook/playbook-command.mjs', label: 'scripts/playbook/playbook-command.mjs', type: 'file' },
  { key: 'updateFromNotesScript', target: 'scripts/playbook/update-playbook-from-notes.mjs', label: 'scripts/playbook/update-playbook-from-notes.mjs', type: 'file' },
];

const OPTIONAL_SCRIPT_PATHS = [
  { key: 'contractsGateScript', target: 'scripts/playbook/contracts-gate.mjs', label: 'scripts/playbook/contracts-gate.mjs (optional)' },
  { key: 'statusDashboardLib', target: 'scripts/playbook/_lib/status-dashboard.mjs', label: 'scripts/playbook/_lib/status-dashboard.mjs (optional)' },
];

const REQUIRED_SCRIPTS = {
  playbook: 'node scripts/playbook/playbook-command.mjs',
  'playbook:update': 'node scripts/playbook/update-playbook-from-notes.mjs',
  'playbook:auto': 'node scripts/playbook/auto.mjs',
  'playbook:install': 'node scripts/playbook/install.mjs',
  'playbook:doctor': 'node scripts/playbook/doctor.mjs',
};

function checkPath({ key, target, label, type }) {
  const absoluteTarget = path.resolve(target);

  if (!fs.existsSync(absoluteTarget)) {
    return { key, target, label, status: 'FAIL', detail: 'Missing' };
  }

  const stat = fs.statSync(absoluteTarget);
  if (type === 'dir' && !stat.isDirectory()) {
    return { key, target, label, status: 'FAIL', detail: 'Expected directory' };
  }

  if (type === 'file' && !stat.isFile()) {
    return { key, target, label, status: 'FAIL', detail: 'Expected file' };
  }

  if (type === 'json') {
    if (!stat.isFile()) {
      return { key, target, label, status: 'FAIL', detail: 'Expected JSON file' };
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(absoluteTarget, 'utf8'));
      if (!parsed || typeof parsed !== 'object') {
        return { key, target, label, status: 'FAIL', detail: 'Invalid JSON object' };
      }
      return { key, target, label, status: 'OK', detail: 'Present + valid JSON' };
    } catch (error) {
      return { key, target, label, status: 'FAIL', detail: `Invalid JSON (${error?.message || 'parse error'})` };
    }
  }

  return { key, target, label, status: 'OK', detail: 'Present' };
}

function checkOptionalPath({ key, target, label }) {
  const absoluteTarget = path.resolve(target);
  if (!fs.existsSync(absoluteTarget)) {
    return { key, target, label, status: 'WARN', detail: 'Not present in this repo (optional)' };
  }

  const stat = fs.statSync(absoluteTarget);
  if (!stat.isFile()) {
    return { key, target, label, status: 'FAIL', detail: 'Expected file when optional path exists' };
  }

  return { key, target, label, status: 'OK', detail: 'Present' };
}

function checkPackageScripts() {
  const packagePath = path.resolve('package.json');
  if (!fs.existsSync(packagePath)) {
    return [{ key: 'packageJson', target: 'package.json', label: 'package.json', status: 'FAIL', detail: 'Missing package.json' }];
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    return [{ key: 'packageJson', target: 'package.json', label: 'package.json', status: 'FAIL', detail: `Invalid JSON (${error?.message || 'parse error'})` }];
  }

  const scripts = parsed?.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {};

  return Object.entries(REQUIRED_SCRIPTS).map(([name, expectedCommand]) => {
    if (!(name in scripts)) {
      return {
        key: `script:${name}`,
        target: 'package.json',
        label: `package.json script "${name}"`,
        status: 'FAIL',
        detail: `Missing (expected: ${expectedCommand})`,
      };
    }

    const actual = String(scripts[name]);
    if (actual !== expectedCommand) {
      return {
        key: `script:${name}`,
        target: 'package.json',
        label: `package.json script "${name}"`,
        status: 'WARN',
        detail: `Expected "${expectedCommand}", found "${actual}"`,
      };
    }

    return {
      key: `script:${name}`,
      target: 'package.json',
      label: `package.json script "${name}"`,
      status: 'OK',
      detail: actual,
    };
  });
}

function summarize(checks) {
  const counts = { OK: 0, WARN: 0, FAIL: 0 };

  for (const check of checks) {
    if (!counts[check.status]) counts[check.status] = 0;
    counts[check.status] += 1;
  }

  const overall = counts.FAIL > 0 ? 'FAIL' : counts.WARN > 0 ? 'WARN' : 'OK';
  return { counts, overall };
}

function renderHuman({ checks, summary }) {
  for (const check of checks) {
    console.log(`${check.status.padEnd(4)} ${check.label} — ${check.detail}`);
  }
  console.log('----');
  console.log(`Overall: ${summary.overall} (OK=${summary.counts.OK}, WARN=${summary.counts.WARN}, FAIL=${summary.counts.FAIL})`);
}

export function runDoctor({ json = false } = {}) {
  const checks = [
    ...REQUIRED_PATHS.map(checkPath),
    ...OPTIONAL_SCRIPT_PATHS.map(checkOptionalPath),
    ...checkPackageScripts(),
  ];

  const summary = summarize(checks);
  const payload = {
    status: summary.overall,
    counts: summary.counts,
    checks,
  };

  if (json) {
    console.log(JSON.stringify(payload));
  } else {
    renderHuman({ checks, summary });
  }

  return payload;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const payload = runDoctor({ json: args.has('--json') });
  process.exit(payload.status === 'FAIL' ? 1 : 0);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  main();
}
