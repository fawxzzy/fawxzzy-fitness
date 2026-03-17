#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [, , command, ...args] = process.argv;
const supported = new Set(['ai-context', 'ai-contract', 'context', 'index', 'query', 'explain', 'ask', 'ignore', 'verify', 'plan', 'pilot']);

if (!command || !supported.has(command)) {
  console.error('[playbook] Unknown or missing command.');
  process.exit(1);
}

const stateRoot = process.env.PLAYBOOK_STATE_ROOT || '.playbook';
const stateDir = path.resolve(process.cwd(), stateRoot);
mkdirSync(stateDir, { recursive: true });
mkdirSync(path.join(stateDir, 'runs'), { recursive: true });

const commandKey = [command, ...args].join('-').replace(/[^a-z0-9_-]+/gi, '_');
const now = new Date().toISOString();

writeFileSync(
  path.join(stateDir, 'last-run.json'),
  JSON.stringify(
    {
      command,
      args,
      stateRoot,
      timestamp: now
    },
    null,
    2
  ) + '\n'
);

writeFileSync(
  path.join(stateDir, 'runs', `${Date.now()}-${commandKey}.log`),
  `${now} ${command} ${args.join(' ')}\n`
);

console.log(`[playbook] ${command} completed via repo-local package runtime.`);
console.log(`[playbook] State root: ${stateRoot}`);
process.exit(0);
