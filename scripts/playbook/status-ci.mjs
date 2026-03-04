#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const DRAFTS_HEADER = '## DRAFTS (auto)';
const ENTRY_HEADER_RE = /^##\s+\d{4}-\d{2}-\d{2}\s+—\s+/;
const STATUS_RE = /^-\s+Status:\s*(.+)$/i;
const WARN_THRESHOLD = 10;
const FAIL_THRESHOLD = 20;

function normalizeStatus(rawStatus) {
  return rawStatus.trim().toLowerCase();
}

function countDrafts(lines) {
  const draftsStart = lines.findIndex((line) => line.trim() === DRAFTS_HEADER);
  if (draftsStart < 0) return 0;

  let count = 0;
  for (let index = draftsStart + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (index > draftsStart + 1 && line.startsWith('## ')) {
      break;
    }

    if (ENTRY_HEADER_RE.test(line)) {
      count += 1;
    }
  }

  return count;
}

function countStatuses(lines) {
  const counts = {
    proposed: 0,
    promoted: 0,
    upstreamed: 0,
  };

  for (const line of lines) {
    const match = line.match(STATUS_RE);
    if (!match) continue;

    const status = normalizeStatus(match[1]);
    if (status === 'proposed') counts.proposed += 1;
    if (status === 'promoted') counts.promoted += 1;
    if (status === 'upstreamed') counts.upstreamed += 1;
  }

  return counts;
}

function suggestCommand(proposed, drafts) {
  if (proposed >= FAIL_THRESHOLD) return 'npm run playbook:sync-and-update';
  if (proposed >= WARN_THRESHOLD) return 'npm run playbook:sync-and-update';
  if (proposed > 0) return 'npm run playbook:update';
  if (drafts > 0) return 'npm run playbook:maintain';
  return 'npm run playbook:guardian';
}

async function main() {
  const content = await fs.readFile(NOTES_PATH, 'utf8');
  const lines = content.split(/\r?\n/);

  const draftsCount = countDrafts(lines);
  const statusCounts = countStatuses(lines);

  const output = {
    drafts: draftsCount,
    proposed: statusCounts.proposed,
    promoted: statusCounts.promoted,
    upstreamed: statusCounts.upstreamed,
    warnThreshold: WARN_THRESHOLD,
    failThreshold: FAIL_THRESHOLD,
    suggestion: suggestCommand(statusCounts.proposed, draftsCount),
    reminder: 'If unsure what to run, use: npm run playbook:maintain',
  };

  process.stdout.write(`${JSON.stringify(output)}\n`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
