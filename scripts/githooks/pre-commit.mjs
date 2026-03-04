#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const steps = [
  ['playbook:precommit', ['run', '-s', 'playbook:precommit']],
  ['playbook:check -- --staged', ['run', '-s', 'playbook:check', '--', '--staged']],
];

for (const [label, args] of steps) {
  console.log(`Playbook pre-commit: running ${label}`);
  const result = run('npm', args);

  if (result.status !== 0) {
    console.error(`Playbook pre-commit failed while running ${label}.`);
    process.exit(result.status ?? 1);
  }
}
