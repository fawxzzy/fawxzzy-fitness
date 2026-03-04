#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readPlaybookStatus, STATUS_PATH } from './status.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playbookCmd = path.join(__dirname, 'playbook-command.mjs');
const updateCmd = path.join(__dirname, 'update-playbook-from-notes.mjs');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, cwd: process.cwd() });
  const rendered = [command, ...args].join(' ');

  if (result.error) {
    throw new Error(
      `Command spawn failed (${rendered}) (${result.error.code ?? 'UNKNOWN'}): ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${rendered}) with exit code ${Number(result.status)}.`);
  }
}

async function main() {
  const node = process.execPath;
  run(node, [playbookCmd]);

  let status = await readPlaybookStatus();
  if (!status) {
    throw new Error('Missing docs/playbook-status.json after playbook run.');
  }

  if (Number(status?.notes?.proposed || 0) > 0) {
    run(node, [updateCmd]);
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
