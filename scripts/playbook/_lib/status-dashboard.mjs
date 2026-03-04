function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStatus(status) {
  const normalized = String(status || 'PASS').toUpperCase();
  return ['PASS', 'WARN', 'FAIL'].includes(normalized) ? normalized : 'PASS';
}

export function readDashboardModel(raw = {}) {
  const contractsStatus = normalizeStatus(raw.contracts?.status);
  const contracts = {
    status: contractsStatus,
    warnCount: toNumber(raw.contracts?.warnCount),
    failCount: toNumber(raw.contracts?.failCount),
    topOffenders: Array.isArray(raw.contracts?.topOffenders) ? raw.contracts.topOffenders : [],
  };

  const recommendation = {
    nextCommand:
      typeof raw.recommendation?.nextCommand === 'string' && raw.recommendation.nextCommand.trim().length > 0
        ? raw.recommendation.nextCommand.trim()
        : null,
    reason:
      typeof raw.recommendation?.reason === 'string' && raw.recommendation.reason.trim().length > 0
        ? raw.recommendation.reason.trim()
        : 'No action required.',
  };

  return {
    drafts: toNumber(raw.drafts),
    proposed: toNumber(raw.proposed),
    promoted: toNumber(raw.promoted),
    contracts,
    recommendation,
  };
}

export function formatDashboardMarkdown(raw) {
  const model = readDashboardModel(raw);
  const offenders = model.contracts.topOffenders.length
    ? model.contracts.topOffenders
        .map((offender) => `- ${offender.name || 'Unknown'}: ${toNumber(offender.count)} (threshold ${toNumber(offender.threshold)})`)
        .join('\n')
    : '- None';

  return [
    '## Playbook Learning Status',
    '',
    `Knowledge Draft/Proposed/Promoted: ${model.drafts}/${model.proposed}/${model.promoted}`,
    `Contracts PASS/WARN/FAIL: ${model.contracts.status}/${model.contracts.warnCount}/${model.contracts.failCount}`,
    'Top offenders:',
    offenders,
    `Next command: ${model.recommendation.nextCommand || 'No action required.'}`,
    `Reason: ${model.recommendation.reason}`,
    '',
  ].join('\n');
}

export function formatDashboardPlain(raw) {
  return formatDashboardMarkdown(raw)
    .replace(/^## /gm, '')
    .replace(/^- /gm, '  - ')
    .trimEnd();
}
