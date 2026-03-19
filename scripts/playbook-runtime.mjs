#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
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
const DEFAULT_PLAYBOOK_VERSION = '0.1.8';
const DEFAULT_PACKAGE_SPEC = `@fawxzzy/playbook-cli@${DEFAULT_PLAYBOOK_VERSION}`;
const DEFAULT_OFFICIAL_FALLBACK_SPEC = `https://github.com/ZachariahRedfield/playbook/releases/download/v${DEFAULT_PLAYBOOK_VERSION}/playbook-cli-${DEFAULT_PLAYBOOK_VERSION}.tgz`;
const OFFICIAL_FALLBACK_SPEC = process.env.PLAYBOOK_OFFICIAL_FALLBACK_SPEC ?? DEFAULT_OFFICIAL_FALLBACK_SPEC;
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

function readBooleanEnv(value) {
  const normalized = normalizeSpec(value).toLowerCase();
  if (!normalized) return false;
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isPackageAcquisitionEnabled(env = process.env) {
  return readBooleanEnv(env.PLAYBOOK_ENABLE_PACKAGE_ACQUIRE) || normalizeSpec(env.PLAYBOOK_PACKAGE_SPEC).length > 0;
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

function toAbsolutePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

function formatNpmInstallCommand(args) {
  return ['npm', ...args].join(' ');
}

function summarizeError(error, depth = 0) {
  if (!error || depth > 3) {
    return [];
  }

  const details = [];
  const name = typeof error.name === 'string' && error.name ? error.name : 'Error';
  const message = typeof error.message === 'string' && error.message ? error.message : String(error);
  details.push(`${name}: ${message}`);

  if (error.cause && error.cause !== error) {
    for (const nested of summarizeError(error.cause, depth + 1)) {
      details.push(`cause -> ${nested}`);
    }
  }

  return details;
}

function ensureNonEmptyFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Downloaded fallback artifact missing on disk: ${filePath}`);
  }

  const stats = statSync(filePath);
  if (stats.size <= 0) {
    throw new Error(`Downloaded fallback artifact was empty: ${filePath}`);
  }

  return stats.size;
}

export async function normalizeFallbackInstallTarget({
  rawSpec,
  runtimeRoot = OFFICIAL_FALLBACK_ROOT,
  fetchImpl = globalThis.fetch,
  logger = console
}) {
  const fallbackSpec = classifyFallbackSpec(rawSpec);
  if (!fallbackSpec.valid) {
    return { fallbackSpec, installSpec: null, downloadedFrom: null, finalUrl: null, fileSize: null };
  }

  if (fallbackSpec.kind !== 'https-url') {
    return {
      fallbackSpec,
      installSpec: fallbackSpec.normalized,
      downloadedFrom: null,
      finalUrl: null,
      fileSize: fallbackSpec.kind === 'local-path' ? ensureNonEmptyFile(toAbsolutePath(fallbackSpec.normalized)) : null
    };
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('Global fetch is unavailable; unable to download https fallback spec.');
  }

  const absoluteRuntimeRoot = toAbsolutePath(runtimeRoot);
  mkdirSync(absoluteRuntimeRoot, { recursive: true });
  const tempDir = mkdtempSync(path.join(absoluteRuntimeRoot, 'download-'));
  const downloadPath = path.join(tempDir, 'playbook-cli.tgz');

  logger.error(`[playbook-runtime] Downloading official fallback URL: ${fallbackSpec.normalized}`);
  logger.error(`[playbook-runtime] Temporary download path: ${downloadPath}`);

  let response;
  try {
    response = await fetchImpl(fallbackSpec.normalized);
  } catch (error) {
    for (const detail of summarizeError(error)) {
      logger.error(`[playbook-runtime] Download failure detail: ${detail}`);
    }
    throw new Error(`Failed to download fallback artifact from ${fallbackSpec.normalized}`);
  }

  const finalUrl = typeof response.url === 'string' && response.url ? response.url : fallbackSpec.normalized;
  logger.error(`[playbook-runtime] Download response: HTTP ${response.status} ${response.statusText}`.trim());
  logger.error(`[playbook-runtime] Final resolved URL: ${finalUrl}`);

  if (!response.ok) {
    throw new Error(`Failed to download fallback artifact: HTTP ${response.status} ${response.statusText}`.trim());
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(downloadPath, buffer);
  const fileSize = ensureNonEmptyFile(downloadPath);
  logger.error(`[playbook-runtime] Downloaded fallback artifact size: ${fileSize} bytes`);

  return {
    fallbackSpec,
    installSpec: downloadPath,
    downloadedFrom: fallbackSpec.normalized,
    finalUrl,
    fileSize
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
  if (!isPackageAcquisitionEnabled()) {
    console.error('[playbook-runtime] Package acquisition is disabled by default because the official GitHub release tarball is the canonical distribution path.');
    console.error('[playbook-runtime] To enable package acquisition explicitly, set PLAYBOOK_ENABLE_PACKAGE_ACQUIRE=1 and/or PLAYBOOK_PACKAGE_SPEC=<published-package-spec>.');
    console.error(`[playbook-runtime] Example: PLAYBOOK_ENABLE_PACKAGE_ACQUIRE=1 PLAYBOOK_PACKAGE_SPEC="${DEFAULT_PACKAGE_SPEC}" node scripts/playbook-runtime.mjs --install-package`);
    process.exit(1);
  }

  const targetSpec = normalizeSpec(PACKAGE_INSTALL_SPEC);
  console.log(`[playbook-runtime] Package acquisition target: ${targetSpec}`);
  const installPlan = installViaNpm({ targetSpec });
  console.log(`[playbook-runtime] Command shape: ${formatNpmInstallCommand(installPlan.args)}`);
  process.exit(installPlan.result.status ?? 1);
}

async function handleInstallOfficialFallback() {
  let resolvedFallback;
  try {
    resolvedFallback = await normalizeFallbackInstallTarget({
      rawSpec: OFFICIAL_FALLBACK_SPEC,
      runtimeRoot: OFFICIAL_FALLBACK_ROOT,
      logger: console
    });
  } catch (error) {
    console.error(`[playbook-runtime] ${error.message}`);
    process.exit(1);
  }

  const { fallbackSpec } = resolvedFallback;

  if (!fallbackSpec.valid) {
    if (fallbackSpec.kind === 'missing') {
      console.error('[playbook-runtime] PLAYBOOK_OFFICIAL_FALLBACK_SPEC resolved to an empty value.');
      console.error(`[playbook-runtime] Default official fallback URL: ${DEFAULT_OFFICIAL_FALLBACK_SPEC}`);
    } else {
      console.error(`[playbook-runtime] Invalid PLAYBOOK_OFFICIAL_FALLBACK_SPEC for official acquisition: ${fallbackSpec.normalized}`);
      console.error('[playbook-runtime] Official acquisition requires a direct install target (file:, local tarball path, https tarball URL, or git+ URL).');
      console.error('[playbook-runtime] Registry-style package specs are not part of the canonical fallback distribution contract.');
    }

    process.exit(1);
  }

  console.log(`[playbook-runtime] Official acquisition target (original): ${fallbackSpec.normalized}`);
  console.log(`[playbook-runtime] Official acquisition spec type: ${fallbackSpec.kind}`);
  if (resolvedFallback.downloadedFrom) {
    console.log(`[playbook-runtime] Official acquisition download source: ${resolvedFallback.downloadedFrom}`);
    console.log(`[playbook-runtime] Official acquisition final URL: ${resolvedFallback.finalUrl}`);
    console.log(`[playbook-runtime] Official acquisition local tarball: ${resolvedFallback.installSpec}`);
    console.log(`[playbook-runtime] Official acquisition tarball size: ${resolvedFallback.fileSize} bytes`);
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
    console.error(`  2) Install the official fallback distribution into ${OFFICIAL_FALLBACK_ROOT} (canonical path: node scripts/playbook-runtime.mjs --install-official-fallback).`);
    console.error('  3) If you explicitly need the package path, enable it with PLAYBOOK_ENABLE_PACKAGE_ACQUIRE=1 and run node scripts/playbook-runtime.mjs --install-package.');
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
