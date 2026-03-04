#!/usr/bin/env node
import { getSignalsFromDiff } from './signals-from-diff.mjs';
import { buildSuggestedNote } from './suggest-notes-from-diff.mjs';

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const signal = getSignalsFromDiff({
    changedFiles: ['src/components/ui/app/AppShell.tsx', 'src/app/globals.css'],
    staged: false,
  });

  const note = buildSuggestedNote({
    changedFiles: signal.changedFiles,
    signal: {
      ...signal,
      dedupe: { isDuplicate: false },
    },
  });

  expect(note.skipped === false, 'Expected note suggestion to be generated.');
  const text = note.lines.join('\n');

  expect(text.includes('- Type: Guardrail'), 'Expected mapped Guardrail type in draft output.');
  expect(
    text.includes('- Suggested Playbook File: Playbook/docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md'),
    'Expected suggested Playbook file from signals mapping in draft output.',
  );
  expect(text.includes('src/components/ui/app/AppShell.tsx'), 'Expected AppShell evidence in draft output.');
  expect(text.includes('src/app/globals.css'), 'Expected globals.css evidence in draft output.');

  console.log('signals-from-diff fixture assertions passed');
}

main();
