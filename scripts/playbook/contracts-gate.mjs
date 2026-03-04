#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_PATH = path.resolve('docs/playbook-status.json');

function isFailStatus(value) {
  return typeof value === 'string' && value.toUpperCase() === 'FAIL';
}

async function main() {
  let parsed;

  try {
    const raw = await fs.readFile(STATUS_PATH, 'utf8');
    parsed = JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.error('Contracts gate failed: docs/playbook-status.json is missing. Run: npm run playbook');
      process.exit(1);
    }
    console.error(`Contracts gate failed: unable to read docs/playbook-status.json (${error?.message || error}).`);
    process.exit(1);
  }

  const contracts = parsed?.contracts ?? {};
  const byContract = Array.isArray(contracts.byContract) ? contracts.byContract : [];

  if (!isFailStatus(contracts.status)) {
    process.exit(0);
  }

  const failingContracts = byContract.filter((contract) => isFailStatus(contract?.status));

  console.error('Contracts gate failed: contracts.status is FAIL in docs/playbook-status.json.');
  if (failingContracts.length > 0) {
    console.error('Failing contracts:');
    for (const contract of failingContracts) {
      console.error(`- ${contract.id ?? 'UNKNOWN_CONTRACT'}`);
    }
  }
  console.error('Run: npm run playbook (then fix listed violations)');
  process.exit(1);
}

main();
