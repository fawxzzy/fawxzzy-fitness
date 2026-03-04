#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_PATH = path.resolve('docs/playbook-status.json');

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

  const failCount = Number(parsed?.contracts?.fail ?? parsed?.contracts?.summary?.fail ?? 0);

  if (failCount <= 0) {
    process.exit(0);
  }

  console.error(`Contracts gate failed: contracts.fail=${failCount} in docs/playbook-status.json.`);
  console.error('Run: npm run playbook (then fix listed violations)');
  process.exit(1);
}

main();
