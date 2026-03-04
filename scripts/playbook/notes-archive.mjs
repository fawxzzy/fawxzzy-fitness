#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseNotesBlocks } from './notes-fingerprint.mjs';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const BACKUP_PATH = path.resolve('docs/PLAYBOOK_NOTES.md.bak');
const ARCHIVE_DIR = path.resolve('docs/_archive');
const DEFAULT_DAYS = 45;

function parseArgs(argv) {
  const daysArg = argv.find((arg) => arg.startsWith('--days='));
  const days = daysArg ? Number(daysArg.split('=')[1]) : DEFAULT_DAYS;

  if (!Number.isFinite(days) || days < 0) {
    throw new Error('Invalid --days value. Example: --days=45');
  }

  return { days };
}

function parseHeaderDate(header) {
  const match = header.match(/^##\s(\d{4})-(\d{2})-(\d{2})\s—\s/);
  if (!match) return null;
  const [, year, month, day] = match;
  const iso = `${year}-${month}-${day}T00:00:00Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toArchiveFileName(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `PLAYBOOK_NOTES_${year}_${month}.md`;
}

function appendWithSpacing(existingText, addition) {
  if (!existingText || existingText.trim().length === 0) {
    return `${addition.replace(/\n+$/g, '\n')}`;
  }

  const base = existingText.endsWith('\n') ? existingText : `${existingText}\n`;
  return `${base}\n${addition.replace(/^\n+/g, '').replace(/\n+$/g, '\n')}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = Date.now();
  const thresholdMs = args.days * 24 * 60 * 60 * 1000;

  const raw = await fs.readFile(NOTES_PATH, 'utf8');
  const normalized = raw.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const blocks = parseNotesBlocks(normalized);

  const toArchive = [];
  const keep = [];

  for (const block of blocks) {
    const blockDate = parseHeaderDate(block.header);
    if (!blockDate) {
      keep.push(block);
      continue;
    }

    const ageMs = now - blockDate.getTime();
    if (ageMs > thresholdMs) {
      toArchive.push({ ...block, blockDate });
    } else {
      keep.push(block);
    }
  }

  console.log(`Total note blocks: ${blocks.length}`);
  console.log(`Archiving blocks older than ${args.days} days.`);
  console.log(`Blocks to archive: ${toArchive.length}`);

  if (toArchive.length === 0) {
    return;
  }

  toArchive.sort((a, b) => a.blockDate.getTime() - b.blockDate.getTime());

  await fs.mkdir(ARCHIVE_DIR, { recursive: true });

  const archiveByFile = new Map();
  for (const block of toArchive) {
    const filename = toArchiveFileName(block.blockDate);
    const list = archiveByFile.get(filename) ?? [];
    list.push(block);
    archiveByFile.set(filename, list);
  }

  for (const [filename, fileBlocks] of archiveByFile.entries()) {
    const destinationPath = path.join(ARCHIVE_DIR, filename);
    let existing = '';
    try {
      existing = await fs.readFile(destinationPath, 'utf8');
    } catch {
      existing = '';
    }

    const payload = fileBlocks.map((block) => block.text).join('\n').replace(/\n+$/g, '\n');
    const updated = appendWithSpacing(existing, payload);
    await fs.writeFile(destinationPath, updated, 'utf8');
    console.log(`Archived ${fileBlocks.length} block(s) -> docs/_archive/${filename}`);
  }

  const archivedLineIndexes = new Set();
  toArchive.forEach((block) => {
    for (let idx = block.startLine - 1; idx < block.endLine; idx += 1) {
      archivedLineIndexes.add(idx);
    }
  });

  const remainingLines = lines.filter((_, idx) => !archivedLineIndexes.has(idx));
  const rewritten = `${remainingLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;

  await fs.copyFile(NOTES_PATH, BACKUP_PATH);
  await fs.writeFile(NOTES_PATH, rewritten, 'utf8');

  console.log(`Rewrote docs/PLAYBOOK_NOTES.md after archiving. Backup: docs/PLAYBOOK_NOTES.md.bak`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
