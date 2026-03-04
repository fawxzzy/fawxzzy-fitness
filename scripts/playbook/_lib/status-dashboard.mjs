function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStatus(status) {
  const normalized = String(status || 'PASS').toUpperCase();
  return ['PASS', 'WARN', 'FAIL'].includes(normalized) ? normalized : 'PASS';
}

export function readDashboardModel(raw = {}) {
  const contractsSummary = raw.contracts?.summary || {};
  const failIds = Array.isArray(raw.contracts?.byContract)
    ? raw.contracts.byContract.filter((entry) => normalizeStatus(entry.status) === 'FAIL').map((entry) => entry.id)
    : [];

  const contracts = {
    status: normalizeStatus(raw.contracts?.status),
    summary: {
      pass: toNumber(contractsSummary.pass),
      warn: toNumber(contractsSummary.warn),
      fail: toNumber(contractsSummary.fail),
    },
    failingIds: failIds,
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

  const smartSignals = {
    autoClassifiedDrafts: toNumber(raw.smartSignals?.autoClassifiedDrafts),
    duplicatesSkipped: toNumber(raw.smartSignals?.duplicatesSkipped),
    boundaryFlags: toNumber(raw.smartSignals?.boundaryFlags),
  };

  return {
    drafts: toNumber(raw.drafts),
    proposed: toNumber(raw.proposed),
    promoted: toNumber(raw.promoted),
    contracts,
    recommendation,
    smartSignals,
  };
}

export function formatDashboardMarkdown(raw) {
  const model = readDashboardModel(raw);
  const failingText = model.contracts.failingIds.length
    ? ` (${model.contracts.failingIds.slice(0, 3).join(', ')})`
    : '';

  const smartSignalsLine = `Smart Signals: autoClassifiedDrafts=${model.smartSignals.autoClassifiedDrafts}, duplicatesSkipped=${model.smartSignals.duplicatesSkipped}, boundaryFlags=${model.smartSignals.boundaryFlags}`;

  return [
    '## Playbook Learning Status',
    '',
    `Knowledge Draft/Proposed/Promoted: ${model.drafts}/${model.proposed}/${model.promoted}`,
    `Contracts: ${model.contracts.status}/WARN(${model.contracts.summary.warn})/FAIL(${model.contracts.summary.fail})${model.contracts.status === 'FAIL' ? failingText : ''}`,
    smartSignalsLine,
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
