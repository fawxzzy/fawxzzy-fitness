import path from 'node:path';

function topFailingContracts(status, limit = 3) {
  return [...status.contracts.byContract]
    .filter((item) => item.status !== 'pass')
    .sort((a, b) => b.violations - a.violations)
    .slice(0, limit);
}

export function formatDashboard(status, statusPath = 'docs/playbook-status.json') {
  const failing = topFailingContracts(status);
  const contractSummary = status.contracts.summary;
  const contractHeadline = contractSummary.fail > 0
    ? `FAIL(${contractSummary.fail})`
    : contractSummary.warn > 0
      ? `WARN(${contractSummary.warn})`
      : 'PASS';

  const lines = [
    '### Playbook Status Dashboard',
    `- Knowledge: Draft **${status.knowledge.draft.count}** / Proposed **${status.knowledge.proposed.count}** / Promoted **${status.knowledge.promoted.count}**`,
    `- Contracts: ${contractHeadline} (pass:${contractSummary.pass} warn:${contractSummary.warn} fail:${contractSummary.fail})`
  ];

  if (failing.length > 0) {
    lines.push(`- Top failing contracts: ${failing.map((item) => `${item.id}(${item.violations})`).join(', ')}`);
  }

  lines.push(`- Next: \`${status.recommendation.nextCommand}\` — ${status.recommendation.reason}`);
  lines.push(`- Status file: \`${path.normalize(statusPath)}\``);

  return `${lines.join('\n')}\n`;
}
