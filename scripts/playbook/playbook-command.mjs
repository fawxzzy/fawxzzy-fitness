#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runNpm } from './_lib/run-npm.mjs';
import { writePlaybookStatus, STATUS_PATH } from './status.mjs';

const STAGEABLE_STATUS_ARTIFACTS = ['docs/playbook-status.json', 'docs/playbook-trend.json'];

function runLocalSnapshot(scriptPath, args = []) {
  const absolutePath = path.resolve(scriptPath);
  try {
    spawnSync('node', [absolutePath, ...args], { stdio: 'inherit', shell: false });
  } catch {
    // Best-effort local snapshot generation only.
  }
}

function stageStatusArtifactsIfPresent() {
  const existing = STAGEABLE_STATUS_ARTIFACTS.filter((relativePath) => existsSync(path.resolve(relativePath)));

  if (existing.length > 0) {
    spawnSync('git', ['add', ...existing], { stdio: 'inherit', shell: false });
  }
}

async function runFallbackMaintenance() {
  const guardianPath = path.resolve('scripts/playbook/guardian-generate-notes.mjs');
  const thresholdPath = path.resolve('scripts/playbook/check-proposed-notes-threshold.mjs');

  if (existsSync(guardianPath)) {
    runLocalSnapshot('scripts/playbook/guardian-generate-notes.mjs');
  }

  if (existsSync(thresholdPath)) {
    runLocalSnapshot('scripts/playbook/check-proposed-notes-threshold.mjs');
  } else {
    runNpm(['run', '-s', 'playbook:threshold']);
  }

  console.log('[playbook] npm runner failed; ran fallback maintenance directly.');
}

async function main() {
  const maintain = runNpm(['run', '-s', 'playbook:maintain']);

  if (!maintain.ok && typeof maintain.status !== 'number') {
    await runFallbackMaintenance();
  }

  if (existsSync(path.resolve('scripts/playbook/contracts-audit.mjs'))) {
    runLocalSnapshot('scripts/playbook/contracts-audit.mjs', ['--quiet']);
  }

  if (existsSync(path.resolve('scripts/playbook/write-trend-files.mjs'))) {
    runLocalSnapshot('scripts/playbook/write-trend-files.mjs');
  }

  const status = await writePlaybookStatus({ promoted: 0 });
  stageStatusArtifactsIfPresent();

  console.log('');
  console.log(`[playbook] Complete. Proposed=${status.notes.proposed}, ContractsFail=${status.contracts.fail}.`);
  if (status.recommended_next_action) {
    console.log(`[playbook] Next: ${status.recommended_next_action} (${status.reason})`);
  } else {
    console.log(`[playbook] Next: none (${status.reason})`);
  }
  console.log(`[playbook] Status artifact: ${path.relative(process.cwd(), STATUS_PATH)}`);

  if (typeof maintain.status === 'number' && maintain.status !== 0) {
    process.exit(maintain.status);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
