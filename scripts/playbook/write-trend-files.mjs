#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const TREND_PATH = path.resolve('docs/playbook-trend.json');
const DRAFTS_HEADER = '## DRAFTS (auto)';
const ENTRY_HEADER_RE = /^##\s+\d{4}-\d{2}-\d{2}\s+—\s+/;
const STATUS_RE = /^-\s+Status:\s*(.+)$/i;
const MAX_ENTRIES = 200;

function normalizeStatus(rawStatus) {
  return rawStatus.trim().toLowerCase();
}

function countDrafts(lines) {
  const draftsStart = lines.findIndex((line) => line.trim() === DRAFTS_HEADER);
  if (draftsStart < 0) return 0;

  let count = 0;
  for (let index = draftsStart + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (index > draftsStart + 1 && line.startsWith('## ')) break;
    if (ENTRY_HEADER_RE.test(line)) count += 1;
  }

  return count;
}

function countStatuses(lines) {
  const counts = { proposed: 0, promoted: 0, upstreamed: 0 };

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

async function readTrendEntries() {
  try {
    const content = await fs.readFile(TREND_PATH, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function toISOSecond(now = new Date()) {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function main() {
  const notesContent = await fs.readFile(NOTES_PATH, 'utf8');
  const lines = notesContent.split(/\r?\n/);

  const drafts = countDrafts(lines);
  const statusCounts = countStatuses(lines);
  const timestamp = toISOSecond();

  const entry = {
    timestamp,
    drafts,
    proposed: statusCounts.proposed,
    promoted: statusCounts.promoted,
    upstreamed: statusCounts.upstreamed,
  };

  const existingEntries = await readTrendEntries();
  const filteredEntries = existingEntries.filter((item) => item && item.timestamp !== timestamp);
  const nextEntries = [...filteredEntries, entry].slice(-MAX_ENTRIES);

  await fs.writeFile(TREND_PATH, `${JSON.stringify(nextEntries, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
