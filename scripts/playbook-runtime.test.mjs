import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { classifyFallbackSpec, normalizeFallbackInstallTarget } from './playbook-runtime.mjs';

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

test('normalizeFallbackInstallTarget keeps local file fallback spec unchanged', async () => {
  const result = await normalizeFallbackInstallTarget({
    rawSpec: '/tmp/playbook-cli.tgz'
  });

  assert.equal(result.fallbackSpec.valid, true);
  assert.equal(result.fallbackSpec.kind, 'local-path');
  assert.equal(result.installSpec, '/tmp/playbook-cli.tgz');
  assert.equal(result.downloadedFrom, null);
});

test('normalizeFallbackInstallTarget downloads https fallback to deterministic local file URL', async () => {
  const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'playbook-runtime-test-'));
  const payload = Buffer.from('fake tgz');

  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => payload,
    url
  });

  const spec = 'https://example.com/releases/playbook-cli-0.3.80.tgz';
  const first = await normalizeFallbackInstallTarget({ rawSpec: spec, runtimeRoot, fetchImpl });
  const second = await normalizeFallbackInstallTarget({ rawSpec: spec, runtimeRoot, fetchImpl });

  assert.equal(first.fallbackSpec.kind, 'https-url');
  assert.equal(first.downloadedFrom, spec);
  assert.match(first.installSpec, /^file:\/\//);
  assert.equal(first.installSpec, second.installSpec);

  const localPath = new URL(first.installSpec);
  assert.equal(existsSync(localPath), true);
  assert.deepEqual(readFileSync(localPath), payload);
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

test('install-official-fallback reports download failures for https fallback specs', () => {
  const run = spawnSync('node', ['scripts/playbook-runtime.mjs', '--install-official-fallback'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYBOOK_OFFICIAL_FALLBACK_SPEC: 'https://127.0.0.1:9/never-there.tgz'
    }
  });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Failed to download fallback artifact/);
});
