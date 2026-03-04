#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const STAGEABLE_OUTPUTS = [
  'docs/PLAYBOOK_NOTES.md',
  'docs/CHANGELOG.md',
  'docs/playbook-status.json',
  'docs/playbook-trend.json',
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: options.cwd ?? process.cwd(),
  });

  if (result.status !== 0) {
    const rendered = [command, ...args].join(' ');
    throw new Error(`Command failed (${rendered}) with exit code ${result.status ?? 'unknown'}.`);
  }
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
    cwd: options.cwd ?? process.cwd(),
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function isDirty(cwd) {
  const status = tryRun('git', ['status', '--porcelain'], { cwd });
  if (!status.ok) return false;
  return status.stdout.trim().length > 0;
}

function gitRoot(cwd) {
  const result = tryRun('git', ['rev-parse', '--show-toplevel'], { cwd });
  return result.ok ? result.stdout.trim() : null;
}

function stageKnownOutputs() {
  for (const relativePath of STAGEABLE_OUTPUTS) {
    const absolutePath = path.resolve(relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    run('git', ['add', relativePath]);
  }
}

function hasMainRepoPlaybookDiff() {
  const diff = tryRun('git', ['diff', '--name-only', '--', 'Playbook']);
  if (!diff.ok) return false;
  return diff.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length > 0;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  run('npm', ['run', 'playbook']);
  run('node', ['scripts/playbook/contracts-gate.mjs']);
  run('npm', ['run', 'playbook:update']);
  stageKnownOutputs();

  const root = process.cwd();
  const playbookPath = path.resolve(root, 'Playbook');
  const mainRoot = gitRoot(root);
  const playbookRoot = gitRoot(playbookPath);
  const hasSeparatePlaybookRepo = Boolean(playbookRoot && mainRoot && playbookRoot !== mainRoot);

  if (hasSeparatePlaybookRepo && isDirty(playbookPath)) {
    fail('Playbook repo has uncommitted changes. Run: npm run playbook:auto');
  }

  if (hasSeparatePlaybookRepo && !isDirty(playbookPath) && hasMainRepoPlaybookDiff()) {
    fail('Playbook subtree appears out of sync. Run: git sync-playbook (or npm run playbook:auto).');
  }
}

main();
