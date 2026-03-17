#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', '-s', 'lint'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error('Pre-commit failed while running lint.');
  process.exit(result.status ?? 1);
}
