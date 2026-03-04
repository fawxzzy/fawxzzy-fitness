#!/usr/bin/env node
import { runContractsAudit } from './index.mjs';
import path from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const cwdArg = args.find((arg) => arg.startsWith('--cwd='));
const cwd = cwdArg ? path.resolve(cwdArg.slice('--cwd='.length)) : process.cwd();

const report = runContractsAudit({ cwd });

if (asJson) {
  console.log(JSON.stringify({
    status: report.status,
    summary: report.summary,
    byContract: report.byContract,
    checks: report.checks
  }, null, 2));
} else {
  console.log(`Contracts: ${report.status}`);
  for (const check of report.checks) {
    console.log(`[${check.status}] ${check.contract} - ${check.message}`);
  }
}

if (report.status === 'FAIL') process.exitCode = 1;
