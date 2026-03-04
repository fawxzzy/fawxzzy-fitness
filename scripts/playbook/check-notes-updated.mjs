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

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function matchesLearningZone(filePath) {
  if (filePath === 'tailwind.config.js' || filePath === 'tailwind.config.ts' || filePath === 'tailwind.config.mjs') {
    return true;
  }
  return zones.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
}

function resolveDiffSpec({ staged }) {
  if (staged) {
    return { range: 'HEAD', source: 'staged-vs-head', staged: true };
  }

  const baseRef = process.env.GITHUB_BASE_REF;
  const headRef = process.env.GITHUB_HEAD_REF;

  if (baseRef && headRef) {
    return { range: `origin/${baseRef}...origin/${headRef}`, source: 'github-env', staged: false };
  }

  try {
    const base = runGit(['rev-parse', 'HEAD~1']);
    return { range: `${base}..HEAD`, source: 'local-head~1', staged: false };
  } catch {
    const head = runGit(['rev-parse', 'HEAD']);
    return { range: `${head}..${head}`, source: 'single-commit-fallback', staged: false };
  }
}

function listChanged({ range, staged }) {
  const args = staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB', range]
    : ['diff', '--name-only', '--diff-filter=ACMRTUXB', range];
  const output = runGit(args);
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

const stagedMode = process.argv.includes('--staged');
const diffSpec = resolveDiffSpec({ staged: stagedMode });
const changed = listChanged(diffSpec);
const matched = changed.filter(matchesLearningZone);
const notesChanged = changed.includes('docs/PLAYBOOK_NOTES.md');

if (matched.length > 0 && !notesChanged) {
  console.error('Playbook learning check failed.');
  console.error(`Detected learning-zone changes (${diffSpec.source}, ${diffSpec.range}) without docs/PLAYBOOK_NOTES.md update.`);
  console.error('Matched files:');
  for (const file of matched) {
    console.error(`- ${file}`);
  }
  console.error('\nSuggested note stub:\n');
  console.error(`## ${new Date().toISOString().slice(0, 10)} — <short title>`);
  console.error('- Type: Guardrail | Pattern | Practice');
  console.error('- Summary: <1–2 sentences>');
  console.error('- Suggested Playbook File: Playbook/docs/INBOX/from-fawxzzyfitness.md');
  console.error('- Rationale: <why this matters / what it prevents>');
  console.error(`- Evidence: ${matched.join(', ')}`);
  console.error('- Status: Proposed');
  process.exit(1);
}

console.log(`Playbook learning check passed (${diffSpec.source}, ${diffSpec.range}).`);
