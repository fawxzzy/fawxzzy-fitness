#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

console.log('Playbook pre-commit: running playbook');
const playbookRun = run('npm', ['run', '-s', 'playbook']);
if (playbookRun.status !== 0) {
  console.warn('Warning: Playbook tooling failed; continuing commit (non-blocking hook).');
}

for (const filePath of ['docs/PLAYBOOK_NOTES.md', 'docs/playbook-status.json']) {
  const changed = spawnSync('git', ['diff', '--quiet', '--', filePath], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  if (changed.status === 1) {
    run('git', ['add', filePath]);
  }
}

process.exit(0);
