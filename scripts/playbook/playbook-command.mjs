#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

async function main() {
  const maintain = spawnSync('npm', ['run', 'playbook:maintain'], { stdio: 'inherit' });
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
    console.log('Status file not found: docs/playbook-status.json');
  }
  console.log(`Recommended next action: ${recommendation}`);
  console.log('If unsure what to run → npm run playbook:maintain');

  if (typeof maintain.status === 'number' && maintain.status !== 0) {
    process.exit(maintain.status);
  }

  if (maintain.error) {
    throw maintain.error;
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
