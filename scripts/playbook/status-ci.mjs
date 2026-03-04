#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { formatDashboardMarkdown } from './_lib/status-dashboard.mjs';

const STATUS_PATH = path.resolve('docs/playbook-status.json');

async function main() {
  const formatArg = process.argv.find((arg) => arg.startsWith('--format='));
  const format = formatArg ? formatArg.split('=')[1] : 'json';

  const raw = await fs.readFile(STATUS_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  if (format === 'dashboard' || format === 'markdown') {
    process.stdout.write(formatDashboardMarkdown(parsed));
    return;
  }

  process.stdout.write(`${JSON.stringify(parsed)}\n`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
