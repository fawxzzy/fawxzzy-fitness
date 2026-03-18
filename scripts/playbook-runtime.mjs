#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

/**
 * Playbook runtime bridge (thin adapter only).
 *
 * Responsibilities:
 * - resolve the Playbook CLI deterministically
 * - forward repo command aliases to canonical upstream runtime
 * - keep runtime writes under `.playbook/` via env/config only
 * - avoid repo-specific workflow, artifact shaping, or fake runtime outputs
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
const OFFICIAL_FALLBACK_ROOT = path.join('.playbook', 'runtime');
const OFFICIAL_FALLBACK_SPEC = process.env.PLAYBOOK_OFFICIAL_FALLBACK_SPEC;
const DEFAULT_PLAYBOOK_VERSION = '0.1.8';
const DEFAULT_PACKAGE_SPEC = `@fawxzzy/playbook-cli@${DEFAULT_PLAYBOOK_VERSION}`;
const DEFAULT_OFFICIAL_FALLBACK_SPEC = `https://github.com/ZachariahRedfield/playbook/releases/download/v${DEFAULT_PLAYBOOK_VERSION}/playbook-cli-${DEFAULT_PLAYBOOK_VERSION}.tgz`;
const PACKAGE_INSTALL_SPEC = process.env.PLAYBOOK_PACKAGE_SPEC ?? DEFAULT_PACKAGE_SPEC;
const command = process.argv[2];

function normalizeSpec(spec) {
  return typeof spec === 'string' ? spec.trim() : '';
}

function isLikelyLocalPath(spec) {
  return spec.startsWith('./')
    || spec.startsWith('../')
    || spec.startsWith('/')
    || /^[A-Za-z]:[\\/]/.test(spec)
    || spec.endsWith('.tgz')
    || spec.endsWith('.tar.gz');
}

export function classifyFallbackSpec(rawSpec) {
  const spec = normalizeSpec(rawSpec);

  if (!spec) {
    return { valid: false, kind: 'missing', normalized: spec };
  }

  if (spec.startsWith('file:')) {
    return { valid: true, kind: 'file-url', normalized: spec };
  }

  if (spec.startsWith('https://') || spec.startsWith('http://')) {
    return { valid: true, kind: 'https-url', normalized: spec };
  }

  if (spec.startsWith('git+') || spec.startsWith('git://') || spec.startsWith('ssh://') || spec.startsWith('git@')) {
    return { valid: true, kind: 'git-url', normalized: spec };
  }

  if (isLikelyLocalPath(spec)) {
    return { valid: true, kind: 'local-path', normalized: spec };
  }

  return { valid: false, kind: 'registry-like', normalized: spec };
}

function sanitizeFilenamePart(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, '-');
}

function toAbsolutePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

function formatNpmInstallCommand(args) {
  return ['npm', ...args].join(' ');
}

function buildRemoteDownloadPath({ url, runtimeRoot }) {
  const parsed = new URL(url);
  const basename = path.posix.basename(parsed.pathname) || 'playbook-cli.tgz';
  const filename = basename.includes('.') ? basename : `${basename}.tgz`;
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const cacheDir = path.join(toAbsolutePath(runtimeRoot), 'cache');
  const downloadName = `official-fallback-${hash}-${sanitizeFilenamePart(filename)}`;
  return path.join(cacheDir, downloadName);
}

export async function normalizeFallbackInstallTarget({
  rawSpec,
  runtimeRoot = OFFICIAL_FALLBACK_ROOT,
  fetchImpl = globalThis.fetch
}) {
  const fallbackSpec = classifyFallbackSpec(rawSpec);
  if (!fallbackSpec.valid) {
    return { fallbackSpec, installSpec: null, downloadedFrom: null };
  }

  if (fallbackSpec.kind !== 'https-url') {
    return { fallbackSpec, installSpec: fallbackSpec.normalized, downloadedFrom: null };
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('Global fetch is unavailable; unable to download https fallback spec.');
  }

  const downloadPath = buildRemoteDownloadPath({
    url: fallbackSpec.normalized,
    runtimeRoot
  });

  mkdirSync(path.dirname(downloadPath), { recursive: true });

  let response;
  try {
    response = await fetchImpl(fallbackSpec.normalized);
  } catch (error) {
    throw new Error(`Failed to download fallback artifact: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to download fallback artifact: HTTP ${response.status} ${response.statusText}`.trim());
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(downloadPath, buffer);

  return {
    fallbackSpec,
    installSpec: pathToFileURL(downloadPath).href,
    downloadedFrom: fallbackSpec.normalized
  };
}

function installViaNpm({ targetSpec, prefix }) {
  const args = ['install', '--no-save'];
  if (prefix) {
    args.push('--prefix', prefix);
  }

  args.push(targetSpec);

  return {
    args,
    result: spawnSync('npm', args, {
    stdio: 'inherit',
    env: process.env
    })
  };
}

function handleInstallPackage() {
  const targetSpec = normalizeSpec(PACKAGE_INSTALL_SPEC);
  console.log(`[playbook-runtime] Package acquisition target: ${targetSpec}`);
  console.log('[playbook-runtime] Command shape: npm install --no-save <package-spec>');

  const installPlan = installViaNpm({ targetSpec });
  console.log(`[playbook-runtime] Command shape: ${formatNpmInstallCommand(installPlan.args)}`);
  process.exit(installPlan.result.status ?? 1);
}

async function handleInstallOfficialFallback() {
  let resolvedFallback;
  try {
    resolvedFallback = await normalizeFallbackInstallTarget({
      rawSpec: OFFICIAL_FALLBACK_SPEC,
      runtimeRoot: OFFICIAL_FALLBACK_ROOT
    });
  } catch (error) {
    console.error(`[playbook-runtime] ${error.message}`);
    process.exit(1);
  }

  const { fallbackSpec } = resolvedFallback;

  if (!fallbackSpec.valid) {
    if (fallbackSpec.kind === 'missing') {
      console.error('[playbook-runtime] PLAYBOOK_OFFICIAL_FALLBACK_SPEC is required for official fallback install.');
      console.error(`[playbook-runtime] Example: PLAYBOOK_OFFICIAL_FALLBACK_SPEC="${DEFAULT_OFFICIAL_FALLBACK_SPEC}" npm run playbook-runtime:install-official-fallback`);
    } else {
      console.error(`[playbook-runtime] Invalid PLAYBOOK_OFFICIAL_FALLBACK_SPEC for direct fallback acquisition: ${fallbackSpec.normalized}`);
      console.error('[playbook-runtime] Fallback acquisition requires a direct install target (file:, local tarball path, https tarball URL, or git+ URL).');
      console.error('[playbook-runtime] Registry-style package specs belong in package acquisition (`npm run playbook-runtime:install-package`).');
    }

    process.exit(1);
  }

  console.log(`[playbook-runtime] Fallback acquisition target (original): ${fallbackSpec.normalized}`);
  console.log(`[playbook-runtime] Fallback spec type: ${fallbackSpec.kind}`);
  if (resolvedFallback.downloadedFrom) {
    console.log(`[playbook-runtime] Fallback download source: ${resolvedFallback.downloadedFrom}`);
    console.log(`[playbook-runtime] Fallback normalized install target: ${resolvedFallback.installSpec}`);
  }

  const installPlan = installViaNpm({
    targetSpec: resolvedFallback.installSpec,
    prefix: OFFICIAL_FALLBACK_ROOT
  });
  console.log(`[playbook-runtime] Command shape: ${formatNpmInstallCommand(installPlan.args)}`);

  process.exit(installPlan.result.status ?? 1);
}

async function main() {
  if (command === '--install-package') {
    handleInstallPackage();
  }

  if (command === '--install-official-fallback') {
    await handleInstallOfficialFallback();
  }

  if (!command || !COMPAT_ALIASES.has(command)) {
    console.log('Usage: node scripts/playbook-runtime.mjs <ai-context|ai-contract|context|index|query|explain|ask|ignore|verify|plan|pilot>');
    console.log('       node scripts/playbook-runtime.mjs <--install-package|--install-official-fallback>');
    process.exit(command ? 1 : 0);
  }

  function executableExtensions() {
    return process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  }

  function findExecutable(basePath) {
    for (const ext of executableExtensions()) {
      const candidate = `${basePath}${ext}`;
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  function resolveBinFromPackageRoot(packageRoot) {
    const packageJsonPath = path.join(packageRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const binField = packageJson.bin;
    if (!binField) {
      return null;
    }

    const relativeBin = typeof binField === 'string'
      ? binField
      : binField.playbook ?? Object.values(binField)[0];

    if (typeof relativeBin !== 'string') {
      return null;
    }

    const absoluteBin = path.resolve(packageRoot, relativeBin);
    return existsSync(absoluteBin) ? absoluteBin : null;
  }

  function resolveInstalledPackageBin() {
  const repoRoot = process.cwd();

  const localBin = findExecutable(path.join(repoRoot, 'node_modules', '.bin', 'playbook'));
  if (localBin) {
    return { bin: localBin, source: `repo-local node_modules binary (${localBin})` };
  }

  const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const declaredPackages = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {})
  ].filter((pkgName) => pkgName.includes('playbook'));

  for (const pkgName of declaredPackages) {
    try {
      const resolvedPackageJson = requireFromRepo.resolve(`${pkgName}/package.json`);
      const packageRoot = path.dirname(resolvedPackageJson);
      const packageBin = resolveBinFromPackageRoot(packageRoot);
      if (packageBin) {
        return { bin: packageBin, source: `installed package entrypoint (${pkgName})` };
      }
    } catch {
      // Deliberately ignore unresolved packages and continue checking candidates.
    }
  }

  return null;
  }

  function resolveRuntimeBin() {
  const checks = [];

  const envOverride = process.env.PLAYBOOK_BIN;
  if (envOverride) {
    checks.push(`PLAYBOOK_BIN=${envOverride}`);
    return { bin: envOverride, source: 'PLAYBOOK_BIN environment override', checks };
  }

  checks.push('PLAYBOOK_BIN not set');

  const packageBin = resolveInstalledPackageBin();
  checks.push('repo-local package/bin resolution');
  if (packageBin) {
    return { ...packageBin, checks };
  }

  const officialFallbackBin = findExecutable(path.join(process.cwd(), OFFICIAL_FALLBACK_ROOT, 'node_modules', '.bin', 'playbook'));
  checks.push(`official fallback install (${OFFICIAL_FALLBACK_ROOT})`);
  if (officialFallbackBin) {
    return {
      bin: officialFallbackBin,
      source: `official fallback install (${OFFICIAL_FALLBACK_ROOT})`,
      checks
    };
  }

  return { bin: null, source: null, checks };
  }

  const passthroughArgs = process.argv.slice(3);
  const resolution = resolveRuntimeBin();

  if (!resolution.bin) {
    console.error('[playbook-runtime] Unable to resolve a Playbook executable.');
    console.error(`[playbook-runtime] Checked: ${resolution.checks.join(' -> ')}`);
    console.error('[playbook-runtime] Fix one of the following:');
    console.error('  1) Set PLAYBOOK_BIN to an explicit Playbook executable path.');
    console.error('  2) Install Playbook as a local package so node_modules/.bin/playbook exists.');
    console.error(`  3) Install the official fallback distribution into ${OFFICIAL_FALLBACK_ROOT} (set PLAYBOOK_OFFICIAL_FALLBACK_SPEC and run npm run playbook-runtime:install-official-fallback).`);
    process.exit(1);
  }

  const result = spawnSync(resolution.bin, [command, ...passthroughArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYBOOK_STATE_ROOT: process.env.PLAYBOOK_STATE_ROOT ?? '.playbook'
    }
  });

  if (result.error) {
    console.error(`[playbook-runtime] Failed to execute resolved Playbook binary from ${resolution.source}.`);
    console.error(`[playbook-runtime] Checked: ${resolution.checks.join(' -> ')}`);
    console.error(`[playbook-runtime] Underlying error: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[playbook-runtime] Unexpected runtime bridge failure: ${error.message}`);
    process.exit(1);
  });
}
