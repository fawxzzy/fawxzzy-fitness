#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { runContractsAudit } from './contracts-audit-lib.mjs';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');
const STATUS_PATH = path.resolve('docs/playbook-status.json');
const TREND_PATH = path.resolve('docs/playbook-trend.json');
const ALLOWLIST_PATH = path.resolve('scripts/playbook/contracts-allowlist.json');
const DRAFTS_HEADER = '## DRAFTS (auto)';
const ENTRY_HEADER_RE = /^##\s+\d{4}-\d{2}-\d{2}\s+—\s+/;
const STATUS_RE = /^-\s+Status:\s*(.+)$/i;
const WARN_THRESHOLD = 10;
const FAIL_THRESHOLD = 20;

function buildKnowledgeGate(proposed) {
  if (proposed >= FAIL_THRESHOLD) {
    return {
      status: 'FAIL',
      warnCount: 0,
      failCount: proposed - FAIL_THRESHOLD + 1,
      topOffenders: [{ name: 'Proposed notes threshold', count: proposed, threshold: FAIL_THRESHOLD }],
    };
  }

  if (proposed >= WARN_THRESHOLD) {
    return {
      status: 'WARN',
      warnCount: proposed - WARN_THRESHOLD + 1,
      failCount: 0,
      topOffenders: [{ name: 'Proposed notes threshold', count: proposed, threshold: WARN_THRESHOLD }],
    };
  }

  return { status: 'PASS', warnCount: 0, failCount: 0, topOffenders: [] };
}

function buildRecommendation({ proposed, drafts, contracts, knowledgeGate }) {
  if (contracts.status === 'FAIL') {
    const failingContracts = contracts.byContract
      .filter((contract) => contract.status === 'FAIL')
      .slice(0, 3)
      .map((contract) => contract.id)
      .join(', ');

    return {
      nextCommand: 'npm run playbook',
      reason: `Contracts failing: ${contracts.summary.fail} contract(s) in FAIL state${failingContracts ? ` (${failingContracts})` : ''}.`,
    };
  }

  if (knowledgeGate.status === 'FAIL') {
    return {
      nextCommand: 'npm run playbook:sync-and-update',
      reason: `Knowledge gate failing: ${knowledgeGate.failCount} threshold breach(es) at fail threshold ${FAIL_THRESHOLD}.`,
    };
  }

  if (contracts.status === 'WARN' || knowledgeGate.status === 'WARN') {
    return {
      nextCommand: 'npm run playbook:sync-and-update',
      reason: `Warnings present (contracts WARN=${contracts.summary.warn}, knowledge WARN=${knowledgeGate.warnCount}).`,
    };
  }

  if (proposed > 0) {
    return {
      nextCommand: 'npm run playbook:update',
      reason: 'Proposed notes are present and should be promoted upstream.',
    };
  }

  if (drafts > 0) {
    return {
      nextCommand: 'npm run playbook:maintain',
      reason: 'Draft notes exist; run maintenance to refine and validate entries.',
    };
  }

  return {
    nextCommand: null,
    reason: 'No action required.',
  };
}

function normalizeStatus(rawStatus) {
  return rawStatus.trim().toLowerCase();
}

function countDrafts(lines) {
  const draftsStart = lines.findIndex((line) => line.trim() === DRAFTS_HEADER);
  if (draftsStart < 0) return 0;

  let count = 0;
  for (let index = draftsStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > draftsStart + 1 && line.startsWith('## ')) break;
    if (ENTRY_HEADER_RE.test(line)) count += 1;
  }

  return count;
}

function countStatuses(lines) {
  const counts = { proposed: 0, promoted: 0, upstreamed: 0 };

  for (const line of lines) {
    const match = line.match(STATUS_RE);
    if (!match) continue;

    const status = normalizeStatus(match[1]);
    if (status === 'proposed') counts.proposed += 1;
    if (status === 'promoted') counts.promoted += 1;
    if (status === 'upstreamed') counts.upstreamed += 1;
  }

  return counts;
}

async function main() {
  const content = await fs.readFile(NOTES_PATH, 'utf8');
  const lines = content.split(/\r?\n/);
  const drafts = countDrafts(lines);
  const statusCounts = countStatuses(lines);
  const contracts = await runContractsAudit({ rootDir: process.cwd(), allowlistPath: ALLOWLIST_PATH });
  const knowledgeGate = buildKnowledgeGate(statusCounts.proposed);
  const recommendation = buildRecommendation({ proposed: statusCounts.proposed, drafts, contracts, knowledgeGate });

  let existingStatus = null;
  try {
    const existingStatusContent = await fs.readFile(STATUS_PATH, 'utf8');
    const parsedStatus = JSON.parse(existingStatusContent);
    existingStatus = parsedStatus && typeof parsedStatus === 'object' ? parsedStatus : null;
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error;
  }

  let trend = [];
  try {
    const trendContent = await fs.readFile(TREND_PATH, 'utf8');
    const parsedTrend = JSON.parse(trendContent);
    trend = Array.isArray(parsedTrend) ? parsedTrend : [];
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error;
  }

  const lastTrendEntry = trend.at(-1);

  const payload = {
    drafts,
    proposed: statusCounts.proposed,
    promoted: statusCounts.promoted,
    upstreamed: statusCounts.upstreamed,
    warnThreshold: WARN_THRESHOLD,
    failThreshold: FAIL_THRESHOLD,
    knowledgeGate,
    contracts,
    recommendation,
    smartSignals: existingStatus?.smartSignals && typeof existingStatus.smartSignals === 'object'
      ? existingStatus.smartSignals
      : null,
    trendLength: trend.length,
    lastTrendTimestamp: lastTrendEntry && typeof lastTrendEntry.timestamp === 'string' ? lastTrendEntry.timestamp : null,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(STATUS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
