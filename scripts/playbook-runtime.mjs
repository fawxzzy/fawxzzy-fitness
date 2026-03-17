#!/usr/bin/env node
import { execSync } from 'node:child_process';

/**
 * TEMPORARY COMPATIBILITY BRIDGE.
 *
 * This file must stay a thin adapter only:
 * - forwards repo aliases to the canonical shared Playbook runtime
 * - keeps local runtime writes under `.playbook/` via env/config only
 * - must not add repo-specific workflow, artifact shaping, or fake runtime outputs
 *
 * Long-term model: shared Playbook core + this repo's local `.playbook` state.
 * Once parity is proven for direct canonical invocation, remove/minimize this wrapper.
 */
const COMPAT_ALIASES = new Set([
  'ai-context',
  'ai-contract',
  'context',
  'index',
  'query',
  'explain',
  'ask',
  'ignore',
  'verify',
  'plan',
  'pilot'
]);
const command = process.argv[2];

if (!command || !COMPAT_ALIASES.has(command)) {
  console.log('Usage: node scripts/playbook-runtime.mjs <ai-context|ai-contract|context|index|query|explain|ask|ignore|verify|plan|pilot>');
  process.exit(command ? 1 : 0);
}

const runtimeBin = process.env.PLAYBOOK_RUNTIME_BIN ?? 'playbook';
const passthroughArgs = process.argv.slice(3).join(' ');
const forwarded = [runtimeBin, command, passthroughArgs].filter(Boolean).join(' ').trim();

try {
  execSync(forwarded, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYBOOK_STATE_ROOT: process.env.PLAYBOOK_STATE_ROOT ?? '.playbook'
    }
  });
} catch (error) {
  if (typeof error?.status === 'number') {
    process.exit(error.status);
  }

  process.exit(1);
}
