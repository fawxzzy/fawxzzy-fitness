#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runNpm } from './_lib/run-npm.mjs';

const STATUS_PATH = path.resolve('docs/playbook-status.json');

function suggestCommand({ proposed, drafts, warnThreshold, failThreshold }) {
  if (proposed >= failThreshold) return 'npm run playbook:sync-and-update';
  if (proposed >= warnThreshold) return 'npm run playbook:sync-and-update';
  if (proposed > 0) return 'npm run playbook:update';
  if (drafts > 0) return 'npm run playbook:maintain';
  return 'No action required.';
}

async function readStatus() {
  try {
    const raw = await fs.readFile(STATUS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      drafts: Number(parsed.drafts) || 0,
      proposed: Number(parsed.proposed) || 0,
      promoted: Number(parsed.promoted) || 0,
      upstreamed: Number(parsed.upstreamed) || 0,
      warnThreshold: Number(parsed.warnThreshold) || 10,
      failThreshold: Number(parsed.failThreshold) || 20,
      found: true,
    };
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }

    return {
      drafts: 0,
      proposed: 0,
      promoted: 0,
      upstreamed: 0,
      warnThreshold: 10,
      failThreshold: 20,
      found: false,
    };
  }
}

function runLocalSnapshot(scriptPath) {
  const absolutePath = path.resolve(scriptPath);
  try {
    spawnSync('node', [absolutePath], { stdio: 'inherit', shell: false });
  } catch {
    // Best-effort local snapshot generation only.
  }
}

async function runFallbackMaintenance() {
  const guardianPath = path.resolve('scripts/playbook/guardian-generate-notes.mjs');
  const thresholdPath = path.resolve('scripts/playbook/check-proposed-notes-threshold.mjs');

  await fs.access(guardianPath).then(
    () => runLocalSnapshot('scripts/playbook/guardian-generate-notes.mjs'),
    () => {},
  );

  await fs.access(thresholdPath).then(
    () => runLocalSnapshot('scripts/playbook/check-proposed-notes-threshold.mjs'),
    () => runNpm(['run', '-s', 'playbook:threshold']),
  );

  console.log('[playbook] npm runner failed; ran fallback maintenance directly.');
}

async function main() {
  const maintain = runNpm(['run', '-s', 'playbook:maintain']);

  if (!maintain.ok && typeof maintain.status !== 'number') {
    await runFallbackMaintenance();
  }

  await fs.access(path.resolve('scripts/playbook/write-status-files.mjs')).then(
    () => runLocalSnapshot('scripts/playbook/write-status-files.mjs'),
    () => {},
  );

  await fs.access(path.resolve('scripts/playbook/write-trend-files.mjs')).then(
    () => runLocalSnapshot('scripts/playbook/write-trend-files.mjs'),
    () => {},
  );

  const status = await readStatus();
  const recommendation = suggestCommand(status);

  console.log('');
  console.log('Playbook Status');
  console.log(`Drafts: ${status.drafts}`);
  console.log(`Proposed: ${status.proposed}`);
  console.log(`Promoted: ${status.promoted}`);
  console.log(`Upstreamed: ${status.upstreamed}`);
  console.log('');
  if (!status.found) {
    console.log('Status snapshot not found. Run: node scripts/playbook/write-status-files.mjs');
  }
  console.log(`Recommended next action: ${recommendation}`);
  console.log('If unsure what to run → npm run playbook');

  if (typeof maintain.status === 'number' && maintain.status !== 0) {
    process.exit(maintain.status);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
