#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readPlaybookStatus, STATUS_PATH } from './status.mjs';

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, cwd: process.cwd() });
  const rendered = [command, ...args].join(' ');

  if (result.error) {
    const code = result.error.code ? ` (${result.error.code})` : '';
    throw new Error(`Command spawn failed (${rendered})${code}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${rendered}) with exit code ${result.status}.`);
  }
}

async function main() {
  const npmCommand = getNpmCommand();
  run(npmCommand, ['run', 'playbook']);

  let status = await readPlaybookStatus();
  if (!status) {
    throw new Error('Missing docs/playbook-status.json after playbook run.');
  }

  if (Number(status?.notes?.proposed || 0) > 0) {
    run(npmCommand, ['run', 'playbook:update']);
    status = await readPlaybookStatus();
    if (!status) {
      throw new Error('Missing docs/playbook-status.json after playbook:update run.');
    }
  }

  const next = status.recommended_next_action ? status.recommended_next_action : 'none';
  console.log('');
  console.log(`[playbook:auto] Proposed=${status.notes.proposed}, Promoted(last action)=${status.notes.promoted}, ContractsFail=${status.contracts.fail}.`);
  console.log(`[playbook:auto] Next: ${next} (${status.reason})`);
  console.log(`[playbook:auto] See ${path.relative(process.cwd(), STATUS_PATH)} and docs/PLAYBOOK_NOTES.md.`);

  process.exit(Number(status?.contracts?.fail || 0) > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
