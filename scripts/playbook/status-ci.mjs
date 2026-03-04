#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_PATH = path.resolve('docs/playbook-status.json');

async function main() {
  const raw = await fs.readFile(STATUS_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  process.stdout.write(`${JSON.stringify(parsed)}\n`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
