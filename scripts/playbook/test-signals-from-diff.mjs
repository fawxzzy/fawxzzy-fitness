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

  const legacyDedupe = getSignalsFromDiff({
    changedFiles: ['src/components/ui/app/AppShell.tsx'],
    staged: false,
  });
  expect(typeof legacyDedupe.dedupe?.kind === 'string', 'Expected normalized dedupe kind for legacy signal shape.');
  expect(typeof legacyDedupe.dedupe?.isDuplicate === 'boolean', 'Expected legacy isDuplicate field to remain available.');

  const note = buildSuggestedNote({
    changedFiles: signal.changedFiles,
    signal: {
      ...signal,
      dedupe: { kind: 'none', isDuplicate: false },
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

  const duplicateNote = buildSuggestedNote({
    changedFiles: signal.changedFiles,
    signal: {
      ...signal,
      dedupe: {
        kind: 'duplicate',
        score: 0.93,
        matchedTitle: 'Enforce single-source safe-area and top-nav offset contracts',
        matchedPath: 'Playbook/docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md',
        matchedAnchor: 'single-source-safe-area',
      },
    },
  });

  expect(duplicateNote.skipped === true, 'Expected duplicate signal to skip draft suggestion.');

  const nearDuplicateNote = buildSuggestedNote({
    changedFiles: signal.changedFiles,
    signal: {
      ...signal,
      dedupe: {
        kind: 'near-duplicate',
        score: 0.81,
        matchedTitle: 'Enforce single-source safe-area and top-nav offset contracts',
        matchedPath: 'Playbook/docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md',
        matchedAnchor: 'single-source-safe-area',
      },
    },
  });

  expect(nearDuplicateNote.skipped === false, 'Expected near-duplicate signal to keep draft suggestion.');
  expect(
    nearDuplicateNote.lines.some((line) => line.includes('Possible duplicate (score=0.81): Enforce single-source safe-area and top-nav offset contracts at Playbook/docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md#single-source-safe-area')),
    'Expected near-duplicate hint line in suggestion output.',
  );

  console.log('signals-from-diff fixture assertions passed');
}

main();
