#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsePlaybookNotes } from './notes-utils.mjs';
import { getPlaybookIntegration, MODE } from './playbook-path.mjs';

const WARN_THRESHOLD = 10;
const FAIL_THRESHOLD = 20;
const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');

function printCommands(integration) {
  if (integration.mode === MODE.MISSING) {
    console.error('Playbook is not detected. Setup first:');
    console.error('1) Clone Playbook adjacent to this repo or add it as a submodule at ./Playbook.');
    console.error('2) Set PLAYBOOK_REPO_PATH if using an external Playbook repo location.');
    return;
  }

  console.error('Suggested next commands:');
  console.error('1) npm run playbook:sync');
  console.error('2) npm run playbook:update');
}

async function main() {
  const content = await fs.readFile(NOTES_PATH, 'utf8');
  const parsed = parsePlaybookNotes(content);
  const proposedCount = parsed.entries.filter((entry) => entry.fields.Status === 'Proposed').length;
  const integration = getPlaybookIntegration();

  if (proposedCount >= FAIL_THRESHOLD) {
    console.error(`Playbook notes threshold exceeded: ${proposedCount} Proposed entries (limit: ${FAIL_THRESHOLD}).`);
    printCommands(integration);
    process.exit(1);
  }

  if (proposedCount >= WARN_THRESHOLD) {
    console.warn(`Playbook notes threshold warning: ${proposedCount} Proposed entries (warn at ${WARN_THRESHOLD}, fail at ${FAIL_THRESHOLD}).`);
    printCommands(integration);
  } else {
    console.log(`Playbook notes threshold OK: ${proposedCount} Proposed entries.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
