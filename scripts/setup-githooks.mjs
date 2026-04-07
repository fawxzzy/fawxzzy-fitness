#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const gitWorkTreeCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
  stdio: 'pipe',
  encoding: 'utf8',
});

if (gitWorkTreeCheck.error) {
  console.error(`Failed to run git: ${gitWorkTreeCheck.error.message}`);
  process.exit(1);
}

if (gitWorkTreeCheck.status !== 0 || gitWorkTreeCheck.stdout.trim() !== 'true') {
  console.log('Skipping git hooks installation because this environment is not a Git worktree.');
  process.exit(0);
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  stdio: 'pipe',
  encoding: 'utf8',
});

if (result.error) {
  console.error(`Failed to run git: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  const stderr = (result.stderr || '').trim();
  console.error(`Failed to configure repository hooks path.${stderr ? `\n${stderr}` : ''}`);
  process.exit(result.status || 1);
}

console.log('Git hooks installed: core.hooksPath is set to .githooks (Git Bash is used for hooks on Windows).');
