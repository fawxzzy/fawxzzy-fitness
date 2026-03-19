import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { classifyFallbackSpec, isPackageAcquisitionEnabled, normalizeFallbackInstallTarget } from './playbook-runtime.mjs';

test('package acquisition stays disabled unless explicitly enabled by env or spec override', () => {
  assert.equal(isPackageAcquisitionEnabled({}), false);
  assert.equal(isPackageAcquisitionEnabled({ PLAYBOOK_ENABLE_PACKAGE_ACQUIRE: '1' }), true);
  assert.equal(isPackageAcquisitionEnabled({ PLAYBOOK_PACKAGE_SPEC: '@scope/pkg@1.2.3' }), true);
});

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

test('normalizeFallbackInstallTarget keeps local file fallback spec unchanged and verifies file size', async () => {
  const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'playbook-runtime-test-'));
  const tarballPath = path.join(runtimeRoot, 'artifact.tgz');
  await import('node:fs/promises').then((fs) => fs.writeFile(tarballPath, Buffer.from('fake tgz')));

  const result = await normalizeFallbackInstallTarget({ rawSpec: tarballPath });

  assert.equal(result.fallbackSpec.valid, true);
  assert.equal(result.fallbackSpec.kind, 'local-path');
  assert.equal(result.installSpec, tarballPath);
  assert.equal(result.downloadedFrom, null);
  assert.equal(result.fileSize, 8);
});

test('normalizeFallbackInstallTarget downloads https fallback to temp tgz path and logs final URL', async () => {
  const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'playbook-runtime-test-'));
  const payload = Buffer.from('fake tgz');
  const messages = [];

  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => payload,
    url: 'https://cdn.example.com/playbook-cli-0.1.8.tgz'
  });

  const spec = 'https://example.com/releases/playbook-cli-0.1.8.tgz';
  const result = await normalizeFallbackInstallTarget({
    rawSpec: spec,
    runtimeRoot,
    fetchImpl,
    logger: { error: (message) => messages.push(message) }
  });

  assert.equal(result.fallbackSpec.kind, 'https-url');
  assert.equal(result.downloadedFrom, spec);
  assert.equal(result.finalUrl, 'https://cdn.example.com/playbook-cli-0.1.8.tgz');
  assert.match(result.installSpec, /playbook-cli\.tgz$/);
  assert.equal(existsSync(result.installSpec), true);
  assert.deepEqual(readFileSync(result.installSpec), payload);
  assert.equal(result.fileSize, payload.length);
  assert.match(messages.join('\n'), /Downloading official fallback URL/);
  assert.match(messages.join('\n'), /Final resolved URL/);
});

test('install-package explains that package acquisition is disabled unless explicitly enabled', () => {
  const run = spawnSync('node', ['scripts/playbook-runtime.mjs', '--install-package'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYBOOK_ENABLE_PACKAGE_ACQUIRE: '',
      PLAYBOOK_PACKAGE_SPEC: ''
    }
  });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Package acquisition is disabled by default/);
  assert.match(run.stderr, /PLAYBOOK_ENABLE_PACKAGE_ACQUIRE=1/);
});

test('install-official-fallback rejects registry-like fallback specs', () => {
  const run = spawnSync('node', ['scripts/playbook-runtime.mjs', '--install-official-fallback'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYBOOK_OFFICIAL_FALLBACK_SPEC: '@fawxzzy/playbook-cli@0.1.8'
    }
  });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Invalid PLAYBOOK_OFFICIAL_FALLBACK_SPEC/);
  assert.match(run.stderr, /not part of the canonical fallback distribution contract/);
});

test('install-official-fallback reports detailed download failures for https fallback specs', () => {
  const run = spawnSync('node', ['scripts/playbook-runtime.mjs', '--install-official-fallback'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYBOOK_OFFICIAL_FALLBACK_SPEC: 'https://127.0.0.1:9/never-there.tgz'
    }
  });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Downloading official fallback URL/);
  assert.match(run.stderr, /Download failure detail:/);
  assert.match(run.stderr, /Failed to download fallback artifact from https:\/\/127.0.0.1:9\/never-there.tgz/);
});
