#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { runContractsAudit } from './contracts-audit-lib.mjs';

function getArg(name) {
  const exact = `--${name}`;
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg === exact) return true;
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return null;
}

async function main() {
  const root = getArg('root');
  const allowlist = getArg('allowlist');
  const writePath = getArg('write');
  const quiet = Boolean(getArg('quiet'));

  const result = await runContractsAudit({
    rootDir: root ? path.resolve(root) : process.cwd(),
    allowlistPath: allowlist ? path.resolve(allowlist) : path.resolve('scripts/playbook/contracts-allowlist.json'),
  });

  const payload = `${JSON.stringify(result, null, 2)}\n`;

  if (!quiet) {
    process.stdout.write(payload);
  }

  if (typeof writePath === 'string' && writePath.length > 0) {
    await fs.writeFile(path.resolve(writePath), payload, 'utf8');
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
