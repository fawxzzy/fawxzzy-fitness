#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { deriveStableId, makePlaybookSection, parsePlaybookNotes, upsertMarkedSection } from './notes-utils.mjs';

const fixturePath = path.resolve('scripts/playbook/__fixtures__/sample_PLAYBOOK_NOTES.md');
const content = await fs.readFile(fixturePath, 'utf8');
const parsed = parsePlaybookNotes(content);

const proposed = parsed.entries.filter((entry) => entry.fields.Status === 'Proposed');
const ids = proposed.map((entry) => deriveStableId(entry.date, entry.title));
const expected = [
  '2026-03-04-example-note-one',
  '2026-03-05-example-note-two',
];

if (JSON.stringify(ids) !== JSON.stringify(expected)) {
  console.error('Unexpected stable IDs.');
  console.error('Expected:', expected.join(', '));
  console.error('Actual:  ', ids.join(', '));
  process.exit(1);
}

console.log('parse-notes self-test passed.');


const firstSection = makePlaybookSection(proposed[0]);
const marker = deriveStableId(proposed[0].date, proposed[0].title);
const seeded = '# Promoted Notes from FawxzzyFitness\n';
const once = upsertMarkedSection(seeded, marker, firstSection);
const twice = upsertMarkedSection(once, marker, firstSection);
if (once !== twice) {
  console.error('Idempotency check failed for marker upsert.');
  process.exit(1);
}
console.log('upsert idempotency self-test passed.');
