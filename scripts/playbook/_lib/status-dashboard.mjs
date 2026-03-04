function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function readDashboardModel(raw = {}) {
  const notes = raw.notes && typeof raw.notes === 'object' ? raw.notes : raw;
  const contracts = raw.contracts && typeof raw.contracts === 'object' ? raw.contracts : {};
  const signals = raw.signals && typeof raw.signals === 'object' ? raw.signals : {};

  return {
    draft: toNumber(notes.draft, toNumber(raw.drafts)),
    proposed: toNumber(notes.proposed, toNumber(raw.proposed)),
    promoted: toNumber(notes.promoted, toNumber(raw.promoted)),
    promotedLastAction: toNumber(notes.promoted_last_action, toNumber(notes.promoted, toNumber(raw.promoted))),
    promotedTotal: toNumber(notes.promoted_total, toNumber(notes.promoted, toNumber(raw.promoted))),
    contracts: {
      pass: toNumber(contracts.pass, toNumber(contracts.summary?.pass)),
      warn: toNumber(contracts.warn, toNumber(contracts.summary?.warn)),
      fail: toNumber(contracts.fail, toNumber(contracts.summary?.fail)),
    },
    recommendation: {
      nextCommand: typeof raw.recommended_next_action === 'string' ? raw.recommended_next_action : '',
      reason: typeof raw.reason === 'string' && raw.reason.trim().length > 0 ? raw.reason.trim() : 'No action required.',
    },
    signals: {
      autoClassified: toNumber(signals.autoClassified),
      duplicatesSkipped: toNumber(signals.duplicatesSkipped),
      boundaryFlags: toNumber(signals.boundaryFlags),
    },
  };
}

export function formatDashboardMarkdown(raw) {
  const model = readDashboardModel(raw);
  return [
    '## Playbook Learning Status',
    '',
    `Notes Draft/Proposed/Promoted(last action): ${model.draft}/${model.proposed}/${model.promotedLastAction}`,
    `Notes Promoted(total): ${model.promotedTotal}`,
    `Contracts: PASS(${model.contracts.pass})/WARN(${model.contracts.warn})/FAIL(${model.contracts.fail})`,
    `Signals: autoClassified=${model.signals.autoClassified}, duplicatesSkipped=${model.signals.duplicatesSkipped}, boundaryFlags=${model.signals.boundaryFlags}`,
    `Next command: ${model.recommendation.nextCommand || 'none'}`,
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
