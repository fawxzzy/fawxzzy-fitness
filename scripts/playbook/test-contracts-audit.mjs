#!/usr/bin/env node
import path from 'node:path';
import { runContractsAudit } from './contracts-audit-lib.mjs';

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const rootDir = path.resolve('scripts/playbook/__fixtures__/contracts');
  const result = await runContractsAudit({ rootDir });

  const byId = new Map(result.byContract.map((contract) => [contract.id, contract]));

  expect(byId.get('SERVER_CLIENT_BOUNDARY')?.status === 'FAIL', 'SERVER_CLIENT_BOUNDARY should FAIL in fixture.');
  expect((byId.get('SERVER_CLIENT_BOUNDARY')?.violations || 0) > 0, 'SERVER_CLIENT_BOUNDARY should report violations.');

  expect(byId.get('SAFE_AREA_OWNERSHIP')?.status === 'FAIL', 'SAFE_AREA_OWNERSHIP should FAIL in fixture.');
  expect((byId.get('SAFE_AREA_OWNERSHIP')?.violations || 0) > 0, 'SAFE_AREA_OWNERSHIP should report violations.');

  expect(byId.get('BOTTOM_ACTIONS_OWNERSHIP')?.status === 'FAIL', 'BOTTOM_ACTIONS_OWNERSHIP should FAIL in fixture.');
  expect((byId.get('BOTTOM_ACTIONS_OWNERSHIP')?.violations || 0) > 0, 'BOTTOM_ACTIONS_OWNERSHIP should report violations.');

  expect(byId.get('SINGLE_SCROLL_OWNER')?.status === 'WARN', 'SINGLE_SCROLL_OWNER should WARN in fixture.');
  expect((byId.get('SINGLE_SCROLL_OWNER')?.violations || 0) > 0, 'SINGLE_SCROLL_OWNER should report warnings.');

  console.log('contracts-audit fixture assertions passed');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
