import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { classifyFallbackSpec } from './playbook-runtime.mjs';

test('classifyFallbackSpec accepts local tarball path as direct fallback target', () => {
  const result = classifyFallbackSpec('./artifacts/playbook-cli.tgz');
  assert.equal(result.valid, true);
  assert.equal(result.kind, 'local-path');
  assert.equal(result.normalized, './artifacts/playbook-cli.tgz');
});

test('classifyFallbackSpec normalizes and accepts https tarball URL', () => {
  const result = classifyFallbackSpec('  https://example.com/playbook-cli.tgz  ');
  assert.equal(result.valid, true);
  assert.equal(result.kind, 'https-url');
  assert.equal(result.normalized, 'https://example.com/playbook-cli.tgz');
});

test('install-official-fallback fails fast with missing fallback spec', () => {
  const run = spawnSync('node', ['scripts/playbook-runtime.mjs', '--install-official-fallback'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYBOOK_OFFICIAL_FALLBACK_SPEC: ''
    }
  });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /PLAYBOOK_OFFICIAL_FALLBACK_SPEC is required/);
});

test('install-official-fallback rejects registry-like fallback specs', () => {
  const run = spawnSync('node', ['scripts/playbook-runtime.mjs', '--install-official-fallback'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYBOOK_OFFICIAL_FALLBACK_SPEC: '@fawxzzy/playbook-cli@0.3.77'
    }
  });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Invalid PLAYBOOK_OFFICIAL_FALLBACK_SPEC/);
  assert.match(run.stderr, /Registry-style package specs belong in package acquisition/);
});
