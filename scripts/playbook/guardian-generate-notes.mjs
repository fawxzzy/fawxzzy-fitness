#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendDraftsToNotes, formatDraftEntry } from './_lib/notes-parser.mjs';
import { readDiffContext } from './_lib/diff-reader.mjs';
import { getSignalsFromDiff } from './signals-from-diff.mjs';

const NOTES_PATH = 'docs/PLAYBOOK_NOTES.md';

const THEMES = [
  {
    key: 'bottom-actions',
    title: 'Standardize bottom-action slot and publish contracts',
    type: 'Guardrail',
    suggestedPlaybookFile: 'Playbook/docs/GUARDRAILS/guardrails.md',
    rationale: 'Bottom action ownership drift causes sticky/fixed regressions that are expensive to catch late.',
    pathMatchers: [/bottom-actions/i, /BottomActionBar/, /BottomActionsProvider/, /BottomActionsSlot/, /ScrollScreenWithBottomActions/, /PublishBottomActions/],
    diffMatchers: [/BottomActionBar/, /BottomActionsProvider/, /BottomActionsSlot/, /ScrollScreenWithBottomActions/, /PublishBottomActions/],
    highSignalMatchers: [/BottomActionBar/, /BottomActionsProvider/, /BottomActionsSlot/, /ScrollScreenWithBottomActions/, /PublishBottomActions/],
  },
  {
    key: 'safe-area-nav',
    title: 'Enforce single-source safe-area and top-nav offset contracts',
    type: 'Guardrail',
    suggestedPlaybookFile: 'Playbook/docs/PATTERNS/server-client-boundaries.md',
    rationale: 'Competing safe-area and header offset sources create route-specific spacing regressions.',
    pathMatchers: [/AppShell/, /AppNav/, /globals\.css$/i, /safe-area/i],
    diffMatchers: [/safe-area/i, /--app-nav/i, /AppShell/, /AppNav/, /globals\.css/],
    highSignalMatchers: [/AppShell/, /AppNav/, /globals\.css$/i],
  },
  {
    key: 'server-shaping',
    title: 'Keep server loaders as canonical data-shaping boundary',
    type: 'Pattern',
    suggestedPlaybookFile: 'Playbook/docs/PATTERNS/server-client-boundaries.md',
    rationale: 'Centralized server shaping prevents duplicated client inference and inconsistent stats behavior.',
    pathMatchers: [/loader/i, /session-summary/i, /exercises-browser/i, /exercise-info/i, /aggregat/i],
    diffMatchers: [/loader/i, /session-summary/i, /exercises-browser/i, /exercise-info/i, /aggregate/i],
    highSignalMatchers: [/session-summary/i, /exercises-browser/i, /exercise-info/i],
  },
  {
    key: 'api-observability',
    title: 'Standardize API error envelopes and request tracing metadata',
    type: 'Guardrail',
    suggestedPlaybookFile: 'Playbook/docs/GUARDRAILS/guardrails.md',
    rationale: 'Shared envelope and trace metadata improve incident triage and keep route contracts deterministic.',
    pathMatchers: [/src\/app\/api\/.*\/route\.ts$/i],
    diffMatchers: [/requestId/, /error envelope/i, /step\b/i, /route\.ts/i],
    highSignalMatchers: [/src\/app\/api\/.*\/route\.ts$/i],
  },
  {
    key: 'tailwind-extraction',
    title: 'Literalize layout-critical Tailwind arbitrary-value classes',
    type: 'Guardrail',
    suggestedPlaybookFile: 'Playbook/docs/GUARDRAILS/guardrails.md',
    rationale: 'Literal class strings keep Tailwind extraction deterministic for spacing-critical utilities.',
    pathMatchers: [/tailwind\.config\.(ts|js|mjs)$/i],
    diffMatchers: [/pb-\[calc\(/, /pt-\[calc\(/, /mb-\[calc\(/, /tailwind\.config/i],
    highSignalMatchers: [/tailwind\.config\.(ts|js|mjs)$/i, /pb-\[calc\(/],
  },
];


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

function matchesAny(value, regexes) {
  return regexes.some((regex) => regex.test(value));
}

function pickThemeEvidence(theme, files, fileDiffs) {
  const fromPaths = files.filter((file) => matchesAny(file, theme.pathMatchers));
  const fromDiff = files.filter((file) => {
    const fileDiff = fileDiffs.get(file) || "";
    return fileDiff.length > 0 && matchesAny(fileDiff, theme.diffMatchers);
  });
  const set = new Set([...fromPaths, ...fromDiff]);
  return Array.from(set).sort();
}

function hasHighSignal(theme, files, fileDiffs) {
  if (files.some((file) => matchesAny(file, theme.highSignalMatchers))) return true;
  return files.some((file) => {
    const fileDiff = fileDiffs.get(file) || "";
    return fileDiff.length > 0 && matchesAny(fileDiff, theme.highSignalMatchers);
  });
}

function shouldEmitDraft(theme, evidenceFiles, files, fileDiffs) {
  if (evidenceFiles.length >= 2) return true;
  if (evidenceFiles.length >= 1 && hasHighSignal(theme, files, fileDiffs)) return true;
  return false;
}

function createDraftId(range, themeKey, evidenceFiles) {
  const source = `${range}|${themeKey}|${evidenceFiles.join('|')}`;
  return createHash('sha1').update(source).digest('hex').slice(0, 16);
}

function createSummary(theme, evidenceFiles) {
  return `Recent git changes indicate a ${theme.key.replace('-', ' ')} learning candidate touching ${evidenceFiles.length} file(s). Capture this as draft guidance for review before promotion.`;
}

function buildDrafts({ range, files, fileDiffs, signal }) {
  const today = new Date().toISOString().slice(0, 10);
  const sharedType = signal?.type || null;
  const sharedSuggested = signal?.suggestedPlaybookFile || null;
  const sharedEvidence = Array.isArray(signal?.evidence) && signal.evidence.length > 0
    ? signal.evidence.slice(0, 10)
    : null;

  return THEMES
    .map((theme) => {
      const evidenceFiles = pickThemeEvidence(theme, files, fileDiffs);
      if (!shouldEmitDraft(theme, evidenceFiles, files, fileDiffs)) {
        return null;
      }

      const id = createDraftId(range, theme.key, evidenceFiles);
      const body = formatDraftEntry({
        id,
        date: today,
        title: theme.title,
        type: sharedType || theme.type,
        summary: createSummary(theme, evidenceFiles),
        suggestedPlaybookFile: sharedSuggested || theme.suggestedPlaybookFile,
        rationale: theme.rationale,
        evidence: sharedEvidence || evidenceFiles,
      });

      const annotatedBody = signal?.dedupe?.kind === 'near-duplicate'
        ? `${body}\n- Possible duplicate (score=${formatScore(signal.dedupe.score)}): ${formatDedupeMatch(signal.dedupe)}`
        : body;

      return {
        id,
        title: theme.title,
        body: annotatedBody,
      };
    })
    .filter(Boolean);
}

function main() {
  const diffContext = readDiffContext(process.argv.slice(2));
  const signal = getSignalsFromDiff({
    staged: false,
    base: diffContext.args.base,
    changedFiles: diffContext.files,
  });

  if (signal.dedupe?.kind === 'duplicate') {
    console.log(`Skipped duplicate draft (score=${formatScore(signal.dedupe.score)}). Matches: ${formatDedupeMatch(signal.dedupe)}. Prefer linking or extending existing doctrine.`);
    return;
  }

  if (signal.dedupe?.kind === 'near-duplicate') {
    console.log(`Possible duplicate detected (score=${formatScore(signal.dedupe.score)}): ${formatDedupeMatch(signal.dedupe)}.`);
  }

  const drafts = buildDrafts({ ...diffContext, signal });
  const { added } = appendDraftsToNotes(NOTES_PATH, drafts);

  console.log(`Drafts added: ${added.length}`);
  if (added.length > 0) {
    console.log('Titles added:');
    for (const draft of added) {
      console.log(`- ${draft.title}`);
    }
  }
  console.log('Review drafts, edit wording, then later run npm run playbook:update');
}

main();
