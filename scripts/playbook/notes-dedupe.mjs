#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { collectEvidenceLines, fingerprintBlock, parseNotesBlocks } from './notes-fingerprint.mjs';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const BACKUP_PATH = path.resolve('docs/PLAYBOOK_NOTES.md.bak');

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
  };
}

function summarizeDuplicates(blocks) {
  const byFingerprint = new Map();

  blocks.forEach((block, index) => {
    const fingerprint = fingerprintBlock(block.text);
    const existing = byFingerprint.get(fingerprint) ?? [];
    existing.push({ ...block, index, fingerprint });
    byFingerprint.set(fingerprint, existing);
  });

  const duplicateGroups = Array.from(byFingerprint.values()).filter((items) => items.length > 1);
  return { byFingerprint, duplicateGroups };
}

function renderReport(totalBlocks, uniqueCount, duplicateGroups) {
  console.log(`Total blocks: ${totalBlocks}`);
  console.log(`Unique fingerprints: ${uniqueCount}`);
  console.log(`Duplicate groups: ${duplicateGroups.length}`);

  if (duplicateGroups.length === 0) {
    return;
  }

  duplicateGroups.forEach((group, idx) => {
    const first = group[0];
    const evidence = collectEvidenceLines(first.text);
    console.log(`\n[${idx + 1}] count=${group.length} header=${first.header}`);
    evidence.forEach((line) => console.log(`  ${line}`));
  });
}

function buildDedupeResult(raw, blocks) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const seen = new Set();
  const skipLines = new Set();

  blocks.forEach((block) => {
    const fingerprint = fingerprintBlock(block.text);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      return;
    }

    for (let idx = block.startLine - 1; idx < block.endLine; idx += 1) {
      skipLines.add(idx);
    }
  });

  const keptLines = lines.filter((_, idx) => !skipLines.has(idx));
  const rewritten = `${keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;

  return {
    rewritten,
    removedCount: skipLines.size > 0 ? blocks.length - seen.size : 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = await fs.readFile(NOTES_PATH, 'utf8');
  const blocks = parseNotesBlocks(raw);
  const { byFingerprint, duplicateGroups } = summarizeDuplicates(blocks);

  renderReport(blocks.length, byFingerprint.size, duplicateGroups);

  if (!args.write || duplicateGroups.length === 0) {
    return;
  }

  const { rewritten, removedCount } = buildDedupeResult(raw, blocks);
  await fs.copyFile(NOTES_PATH, BACKUP_PATH);
  await fs.writeFile(NOTES_PATH, rewritten, 'utf8');

  console.log(`\nRewrote docs/PLAYBOOK_NOTES.md. Removed ${removedCount} duplicate block(s). Backup: docs/PLAYBOOK_NOTES.md.bak`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
