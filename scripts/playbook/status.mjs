import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parsePlaybookNotes } from './notes-utils.mjs';
import { runContractsAudit } from './contracts-audit-lib.mjs';
import { getSignalsFromDiff } from './signals-from-diff.mjs';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const STATUS_PATH = path.resolve('docs/playbook-status.json');
const ALLOWLIST_PATH = path.resolve('scripts/playbook/contracts-allowlist.json');

function safeGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: false });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim() || null;
}

function repoMetadata() {
  return {
    name: safeGit(['rev-parse', '--show-toplevel'])?.split(/[\\/]/).filter(Boolean).at(-1) ?? null,
    branch: safeGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    head_sha: safeGit(['rev-parse', 'HEAD']),
  };
}

function countNotes(content) {
  const parsed = parsePlaybookNotes(content);
  const counts = { draft: 0, proposed: 0, promoted: 0 };

  for (const entry of parsed.entries) {
    const status = String(entry.fields.Status || '').trim().toLowerCase();
    if (status === 'draft') counts.draft += 1;
    if (status === 'proposed') counts.proposed += 1;
    if (status === 'promoted') counts.promoted += 1;
  }

  return counts;
}

function deriveSignalSummary(signal) {
  if (!signal || typeof signal !== 'object') {
    return { autoClassified: 0, duplicatesSkipped: 0, boundaryFlags: 0 };
  }

  const dedupeKind = signal.dedupe?.kind;
  const boundaryFlags = Array.isArray(signal.boundaryFlags)
    ? [...new Set(signal.boundaryFlags.map((flag) => String(flag).trim()).filter(Boolean))]
    : [];

  return {
    autoClassified: signal.type ? 1 : 0,
    duplicatesSkipped: dedupeKind === 'duplicate' ? 1 : 0,
    boundaryFlags: boundaryFlags.length,
  };
}

export async function computePlaybookStatus({ promoted = 0, reason = null, recommendedNextAction = null } = {}) {
  const notesContent = await fs.readFile(NOTES_PATH, 'utf8');
  const notes = countNotes(notesContent);
  const contracts = await runContractsAudit({ rootDir: process.cwd(), allowlistPath: ALLOWLIST_PATH });
  const signal = getSignalsFromDiff({ staged: false });

  let nextAction = typeof recommendedNextAction === 'string' ? recommendedNextAction : null;
  let nextReason = typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null;

  if (nextAction === null) {
    if (notes.proposed > 0) {
      nextAction = 'npm run playbook:update';
      nextReason = nextReason || 'Proposed notes detected.';
    } else {
      nextAction = '';
      nextReason = nextReason || 'No Proposed notes.';
    }
  }

  return {
    schema_version: 1,
    repo: repoMetadata(),
    timestamps: {
      last_run_iso: new Date().toISOString(),
    },
    notes: {
      draft: notes.draft,
      proposed: notes.proposed,
      promoted,
    },
    contracts: {
      pass: Number(contracts?.summary?.pass || 0),
      warn: Number(contracts?.summary?.warn || 0),
      fail: Number(contracts?.summary?.fail || 0),
    },
    signals: deriveSignalSummary(signal),
    recommended_next_action: nextAction,
    reason: nextReason || 'No action required.',
    commands: {
      run: 'npm run playbook',
      promote: 'npm run playbook:update',
      auto: 'npm run playbook:auto',
    },
  };
}

export async function writePlaybookStatus(options = {}) {
  const payload = await computePlaybookStatus(options);
  await fs.writeFile(STATUS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export async function readPlaybookStatus() {
  try {
    const content = await fs.readFile(STATUS_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export { STATUS_PATH };
