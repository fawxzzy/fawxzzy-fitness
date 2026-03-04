#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { formatDashboard } from './dashboard.mjs';

const cwd = process.cwd();
const statusPath = path.resolve(cwd, 'docs/playbook-status.json');
const includeSignals = process.argv.slice(2).includes('--include-signals');

if (!fs.existsSync(statusPath)) {
  console.error(`playbook dashboard error: missing ${statusPath}. Run npm run playbook first.`);
  process.exit(1);
}

const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const markdown = formatDashboard(status, 'docs/playbook-status.json', { includeSignals });
console.log(markdown);
