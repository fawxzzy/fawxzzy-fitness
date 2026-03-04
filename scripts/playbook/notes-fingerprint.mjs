#!/usr/bin/env node
import crypto from 'node:crypto';

const NOTE_HEADING_REGEX = /^##\s\d{4}-\d{2}-\d{2}\s—\s.+$/m;

function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, '\n');
}

function normalizeWhitespace(value) {
  return normalizeLineEndings(value)
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLine(blockText, label) {
  const expression = new RegExp(`^[-*]?\\s*${label}:\\s*(.+)$`, 'mi');
  const match = blockText.match(expression);
  return match ? `${label}: ${match[1].trim()}` : '';
}

export function parseNotesBlocks(rawText) {
  const text = normalizeLineEndings(rawText);
  const lines = text.split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!/^##\s\d{4}-\d{2}-\d{2}\s—\s.+$/.test(line)) {
      index += 1;
      continue;
    }

    const start = index;
    index += 1;
    while (index < lines.length && !/^##\s\d{4}-\d{2}-\d{2}\s—\s.+$/.test(lines[index])) {
      index += 1;
    }

    const endExclusive = index;
    const rawBlock = `${lines.slice(start, endExclusive).join('\n')}\n`;
    blocks.push({
      header: lines[start],
      text: rawBlock,
      startLine: start + 1,
      endLine: endExclusive,
    });
  }

  return blocks;
}

export function fingerprintBlock(blockText, algorithm = 'sha1') {
  const normalized = normalizeWhitespace(blockText);
  const lines = normalized.split('\n');
  const header = lines.find((line) => /^##\s\d{4}-\d{2}-\d{2}\s—\s.+$/.test(line)) ?? '';
  const typeLine = extractLine(normalized, 'Type');
  const summaryLine = extractLine(normalized, 'Summary');
  const evidenceLine = extractLine(normalized, 'Evidence');
  const payload = [header, typeLine, summaryLine, evidenceLine].join('\n');

  return crypto.createHash(algorithm).update(payload).digest('hex');
}

export function collectEvidenceLines(blockText, limit = 2) {
  const normalized = normalizeLineEndings(blockText);
  return normalized
    .split('\n')
    .filter((line) => /^[-*]?\s*Evidence:/i.test(line))
    .slice(0, limit)
    .map((line) => line.trim());
}

export function hasParsableBlocks(rawText) {
  return NOTE_HEADING_REGEX.test(rawText);
}
