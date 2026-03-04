#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { getPlaybookIntegration, MODE } from './playbook-path.mjs';

function safe() {
  try {
    const integration = getPlaybookIntegration();
    if (!integration || integration.mode === MODE.MISSING || !integration.repoPath) {
      console.log('Playbook revision: unavailable (integration missing).');
      return;
    }

    const sha = execSync(`git -C "${integration.repoPath}" rev-parse HEAD`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();

    console.log(`Playbook mode: ${integration.mode}`);
    console.log(`Playbook revision: ${sha}`);
  } catch {
    console.log('Playbook revision: unavailable (error reading revision).');
  }
}

safe();
process.exit(0);
