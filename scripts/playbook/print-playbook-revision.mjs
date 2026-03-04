#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { getPlaybookIntegration, MODE } from './playbook-path.mjs';

function git(args, cwd = process.cwd()) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function main() {
  const integration = getPlaybookIntegration();
  if (integration.mode === MODE.MISSING || !integration.repoPath) {
    console.log('Playbook revision: unavailable (integration missing).');
    return;
  }

  const sha = git(['rev-parse', 'HEAD'], integration.repoPath);
  console.log(`Playbook mode: ${integration.mode}`);
  console.log(`Playbook revision: ${sha}`);
}

main();
