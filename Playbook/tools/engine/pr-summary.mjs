#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { formatDashboard } from './dashboard.mjs';

const cwd = process.cwd();
const statusPath = path.resolve(cwd, 'docs/playbook-status.json');

if (!fs.existsSync(statusPath)) {
  console.error(`playbook summary error: status file missing at ${statusPath}. Run npm run playbook first.`);
  process.exit(1);
}

const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const markdown = formatDashboard(status, 'docs/playbook-status.json');

console.log(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}
