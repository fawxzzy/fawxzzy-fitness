#!/usr/bin/env node
import { getSignalsFromDiff } from './signals-from-diff.mjs';

const zones = [
  'src/components/layout/',
  'src/components/ui/app/',
  'src/lib/',
  'src/app/api/',
  'supabase/migrations/',
  'middleware.ts',
];

function parseArgs(argv) {
  const args = {
    base: null,
    head: null,
    staged: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--base') {
      args.base = argv[index + 1] ?? null;
      args.staged = false;
      index += 1;
      continue;
    }
    if (token === '--head') {
      args.head = argv[index + 1] ?? null;
      args.staged = false;
      index += 1;
    }
  }

  return args;
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

function capEvidence(evidence, max = 8) {
  if (evidence.length <= max) return evidence;
  const limited = evidence.slice(0, max);
  return [...limited, `(+${evidence.length - max} more)`];
}

function formatDedupeMatch(dedupe) {
  const matchedTitle = dedupe?.matchedTitle || 'Unknown doctrine';
  const matchedPath = dedupe?.matchedPath || 'unknown-path';
  const anchor = dedupe?.matchedAnchor ? `#${dedupe.matchedAnchor}` : '';
  return `${matchedTitle} at ${matchedPath}${anchor}`;
}

function formatScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return '0.00';
  return numeric.toFixed(2);
}

export function buildSuggestedNote({ changedFiles, signal }) {
  const matched = changedFiles.filter(matchesLearningZone);
  if (matched.length === 0) {
    return { skipped: true, reason: 'no-learning-zone' };
  }

  if (signal.dedupe?.kind === 'duplicate') {
    return {
      skipped: true,
      reason: 'duplicate',
      score: signal.dedupe.score,
      match: formatDedupeMatch(signal.dedupe),
    };
  }

  const evidence = capEvidence(signal.evidence.length > 0 ? signal.evidence : matched);
  const suggestedPlaybookFile = signal.suggestedPlaybookFile || 'Playbook/docs/INBOX/from-fawxzzyfitness.md';

  const lines = [
    `## ${new Date().toISOString().slice(0, 10)} — ${guessTitle(matched)}`,
    `- Type: ${signal.type}`,
    '- Summary: <1–2 sentences>',
    `- Suggested Playbook File: ${suggestedPlaybookFile}`,
    '- Rationale: <why this matters / what it prevents>',
    `- Evidence: ${evidence.join(', ')}`,
  ];

  if (signal.dedupe?.kind === 'near-duplicate') {
    lines.push(`- Possible duplicate (score=${formatScore(signal.dedupe.score)}): ${formatDedupeMatch(signal.dedupe)}`);
  }

  lines.push('- Status: Proposed');

  return {
    skipped: false,
    lines,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const signal = getSignalsFromDiff(args);
  const result = buildSuggestedNote({ changedFiles: signal.changedFiles, signal });

  if (result.skipped && result.reason === 'no-learning-zone') {
    console.log('No learning-zone changes detected in diff scope.');
    process.exit(0);
  }

  if (result.skipped && result.reason === 'duplicate') {
    console.log(`Skipped duplicate draft (score=${formatScore(result.score)}). Matches: ${result.match}. Prefer linking or extending existing doctrine.`);
    process.exit(0);
  }

  if (signal.dedupe?.kind === 'near-duplicate') {
    console.log(`Possible duplicate detected (score=${formatScore(signal.dedupe.score)}): ${formatDedupeMatch(signal.dedupe)}.`);
  }

  console.log('Suggested PLAYBOOK_NOTES.md entry:\n');
  for (const line of result.lines) {
    console.log(line);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
