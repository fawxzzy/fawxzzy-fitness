#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { parsePlaybookNotes } from '../notes-utils.mjs';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const OUTPUT_PATH = path.resolve('docs/contracts.suggestions.json');

const IMPORT_KEYWORDS = ['server/client', 'use client', 'boundary', 'loader', 'import'];
const REPO_KEYWORDS = ['changelog', 'notes', 'must update'];

function normalizeFieldMap(fields) {
  const normalized = new Map();
  for (const [key, value] of Object.entries(fields)) {
    normalized.set(String(key).trim().toLowerCase(), String(value ?? '').trim());
  }
  return normalized;
}

function hashSourceNote({ date, title, summary, type }) {
  const stableInput = [date, title, summary, type.toLowerCase()].join('|');
  return createHash('sha256').update(stableInput).digest('hex').slice(0, 16);
}

function normalizeIdFragment(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function matchKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword));
}

function buildImportsSuggestion(note, matches) {
  const explicitImportMention = matches.includes('import');
  const confidence = explicitImportMention ? 'high' : 'medium';
  const idBase = normalizeIdFragment(note.title) || 'guardrail';

  return {
    note_date: note.date,
    note_title: note.title,
    note_summary: note.summary,
    source_note_hash: note.source_note_hash,
    confidence,
    suggested_contract: {
      id: `suggested-import-boundary-${idBase}`,
      severity: 'fail',
      type: 'imports',
      description: `Enforce import boundary guardrail derived from note: ${note.title}.`,
      match_from: ['src/**/*.ts', 'src/**/*.tsx'],
      forbid_imports: ['**/*.client.*', '**/*.client/**'],
    },
    rationale: `Matched import/boundary keywords: ${matches.join(', ')}.`,
  };
}

function buildRepoSuggestion(note, matches) {
  const idBase = normalizeIdFragment(note.title) || 'guardrail';
  return {
    note_date: note.date,
    note_title: note.title,
    note_summary: note.summary,
    source_note_hash: note.source_note_hash,
    confidence: 'medium',
    suggested_contract: {
      id: `suggested-repo-discipline-${idBase}`,
      severity: 'warn',
      type: 'repo',
      description: `Track documentation/update discipline from guardrail note: ${note.title}.`,
      match_from: ['docs/CHANGELOG.md', 'docs/PLAYBOOK_NOTES.md'],
      forbid_imports: [],
    },
    rationale: `Matched repo/process keywords: ${matches.join(', ')}.`,
  };
}

function parseGuardrailNotes() {
  const notesContent = readFileSync(NOTES_PATH, 'utf8');
  const { entries } = parsePlaybookNotes(notesContent);

  return entries
    .map((entry) => {
      const fields = normalizeFieldMap(entry.fields);
      const type = fields.get('type') ?? '';
      const summary = fields.get('summary') ?? '';

      return {
        date: entry.date,
        title: entry.title,
        type,
        summary,
      };
    })
    .filter((entry) => entry.type.toLowerCase() === 'guardrail')
    .map((entry) => ({
      ...entry,
      source_note_hash: hashSourceNote(entry),
    }));
}

function suggestContracts(guardrails) {
  const suggestions = [];

  for (const guardrail of guardrails) {
    const haystack = `${guardrail.title}\n${guardrail.summary}`;

    const importMatches = matchKeywords(haystack, IMPORT_KEYWORDS);
    if (importMatches.length > 0) {
      suggestions.push(buildImportsSuggestion(guardrail, importMatches));
      continue;
    }

    const repoMatches = matchKeywords(haystack, REPO_KEYWORDS);
    if (repoMatches.length > 0) {
      suggestions.push(buildRepoSuggestion(guardrail, repoMatches));
    }
  }

  return suggestions;
}

function main() {
  const guardrails = parseGuardrailNotes();
  const suggestions = suggestContracts(guardrails);

  const payload = {
    schema_version: 1,
    generated_by: 'scripts/playbook/contracts/suggest-contracts-from-notes.mjs',
    source: 'docs/PLAYBOOK_NOTES.md',
    note_type_filter: 'Guardrail',
    suggestion_count: suggestions.length,
    suggestions,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Found ${guardrails.length} guardrails`);
  console.log(`Produced ${suggestions.length} suggestions`);
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`contracts:suggest advisory run failed: ${message}`);
  process.exit(0);
}
