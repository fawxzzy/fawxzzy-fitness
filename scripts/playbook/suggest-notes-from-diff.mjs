#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const zones = [
  'src/components/layout/',
  'src/components/ui/app/',
  'src/lib/',
  'src/app/api/',
  'supabase/migrations/',
  'middleware.ts',
];

function parseArgs(argv) {
  const args = { base: 'HEAD~1' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--base') {
      args.base = argv[index + 1] ?? args.base;
      index += 1;
    }
  }
  return args;
}

function changedFiles(base) {
  try {
    const output = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMRTUXB', base],
      { encoding: 'utf8' },
    );
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function matchesLearningZone(filePath) {
  if (filePath === 'tailwind.config.js' || filePath === 'tailwind.config.ts' || filePath === 'tailwind.config.mjs') {
    return true;
  }
  return zones.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
}

function guessTitle(files) {
  if (files.some((file) => file.startsWith('supabase/migrations/'))) {
    return 'Migration safety and data backfill guardrail';
  }
  if (files.some((file) => file.startsWith('src/app/api/'))) {
    return 'API boundary and response-shape guardrail';
  }
  if (files.some((file) => file.startsWith('src/components/layout/') || file.startsWith('src/components/ui/app/'))) {
    return 'Shared app-shell layout pattern';
  }
  if (files.some((file) => file.startsWith('src/lib/'))) {
    return 'Reusable server-side logic pattern';
  }
  return 'Reusable implementation learning';
}

function guessType(files) {
  if (files.some((file) => file.startsWith('supabase/migrations/') || file.startsWith('src/app/api/'))) {
    return 'Guardrail';
  }
  if (files.some((file) => file.startsWith('src/components/layout/') || file.startsWith('src/components/ui/app/'))) {
    return 'Pattern';
  }
  return 'Practice';
}

const { base } = parseArgs(process.argv.slice(2));
const files = changedFiles(base);
const matched = files.filter(matchesLearningZone);

if (matched.length === 0) {
  console.log(`No learning-zone changes detected from base ${base}.`);
  process.exit(0);
}

console.log('Suggested PLAYBOOK_NOTES.md entry:\n');
console.log(`## ${new Date().toISOString().slice(0, 10)} — ${guessTitle(matched)}`);
console.log(`- Type: ${guessType(matched)}`);
console.log('- Summary: <1–2 sentences>');
console.log('- Suggested Playbook File: Playbook/docs/GUARDRAILS/guardrails.md');
console.log('- Rationale: <why this matters / what it prevents>');
console.log(`- Evidence: ${matched.join(', ')}`);
console.log('- Status: Proposed');
