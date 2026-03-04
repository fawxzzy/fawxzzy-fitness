#!/usr/bin/env node
import fs from 'node:fs';
import { runEngine } from './index.mjs';
import { formatDashboard } from './dashboard.mjs';

function printReport(report, { verbose = false } = {}) {
  console.log('Playbook Knowledge Lifecycle Snapshot');
  console.log('------------------------------------');
  console.log(`Observation: ${report.counts.Observation}`);
  console.log(`Draft: ${report.counts.Draft}`);
  console.log(`Proposed: ${report.counts.Proposed}`);
  console.log(`Promoted: ${report.counts.Promoted}`);
  console.log(`Contract: ${report.counts.Contract}`);
  console.log(`Other/Unknown: ${report.counts.Other}`);
  console.log(`Contracts: ${report.contracts.status}`);
  if (report.missingFieldCount > 0) {
    console.log(`Missing required fields: ${report.missingFieldCount} (${report.policy.toUpperCase()})`);
  }
  console.log(`Suggested next command: ${report.suggestedCommand}`);
  console.log(`Trend file: ${report.trendPath}`);
  if (verbose) {
    console.log(`Status file: ${report.statusPath}`);
  }

  for (const check of report.contracts.checks) {
    console.log(`[${check.status}] ${check.contract} - ${check.message}`);
  }
  if (verbose && fs.existsSync(report.statusPath)) {
    const status = JSON.parse(fs.readFileSync(report.statusPath, 'utf8'));
    console.log('');
    console.log(formatDashboard(status, 'docs/playbook-status.json'));
  }
}


const args = process.argv.slice(2);
const mode = args[0] && !args[0].startsWith('--') ? args[0] : 'run';
const verbose = args.includes('--verbose');
const cwdArg = args.find((arg) => arg.startsWith('--cwd='));
const cwd = cwdArg ? cwdArg.slice('--cwd='.length) : process.cwd();

try {
  const report = runEngine({ mode, cwd });
  printReport(report, { verbose });
  if (report.contracts.status === 'FAIL') {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`playbook-engine error: ${error.message}`);
  process.exitCode = 1;
}
