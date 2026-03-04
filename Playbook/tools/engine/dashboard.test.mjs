import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDashboard } from './dashboard.mjs';

const status = {
  knowledge: { draft: { count: 1 }, proposed: { count: 2 }, promoted: { count: 3 } },
  contracts: {
    summary: { pass: 1, warn: 1, fail: 0 },
    byContract: [
      { id: 'SAFE_AREA_OWNERSHIP', status: 'warn', violations: 1 },
      { id: 'SERVER_CLIENT_BOUNDARY', status: 'pass', violations: 0 }
    ]
  },
  recommendation: { nextCommand: 'npm run playbook:status', reason: 'No promotions required.' },
  smartSignals: {
    summary: { autoClassifiedDrafts: 1, duplicatesSkipped: 1, boundaryFlags: ['db', 'server-client'] }
  }
};

test('formatDashboard can include smart signal summary', () => {
  const markdown = formatDashboard(status, 'docs/playbook-status.json', { includeSignals: true });
  assert.match(markdown, /Auto-classified drafts: 1 \/ duplicates skipped: 1/);
  assert.match(markdown, /Boundary flags: db, server-client/);
});
