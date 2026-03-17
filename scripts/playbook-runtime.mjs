#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * TEMPORARY COMPATIBILITY BRIDGE.
 *
 * This file must stay a thin adapter only:
 * - resolves the Playbook CLI deterministically
 * - forwards repo aliases to the canonical shared Playbook runtime
 * - keeps local runtime writes under `.playbook/` via env/config only
 * - must not add repo-specific workflow, artifact shaping, or fake runtime outputs
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
const DEV_FALLBACK_ROOT = 'C:\\Users\\zjhre\\dev\\playbook';
const command = process.argv[2];

if (!command || !COMPAT_ALIASES.has(command)) {
  console.log('Usage: node scripts/playbook-runtime.mjs <ai-context|ai-contract|context|index|query|explain|ask|ignore|verify|plan|pilot>');
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

function resolveDevFallbackBin() {
  const localCheckoutBin = findExecutable(path.join(DEV_FALLBACK_ROOT, 'node_modules', '.bin', 'playbook'));
  if (localCheckoutBin) {
    return { bin: localCheckoutBin, source: `dev fallback local checkout (${DEV_FALLBACK_ROOT})` };
  }

  const packageBin = resolveBinFromPackageRoot(DEV_FALLBACK_ROOT);
  if (packageBin) {
    return { bin: packageBin, source: `dev fallback package entrypoint (${DEV_FALLBACK_ROOT})` };
  }

  return null;
}

function resolveRuntimeBin() {
  const checks = [];

  const envOverride = process.env.PLAYBOOK_BIN ?? process.env.PLAYBOOK_RUNTIME_BIN;
  if (envOverride) {
    checks.push(`PLAYBOOK_BIN/PLAYBOOK_RUNTIME_BIN=${envOverride}`);
    return { bin: envOverride, source: 'PLAYBOOK_BIN environment override', checks };
  }

  checks.push('PLAYBOOK_BIN/PLAYBOOK_RUNTIME_BIN not set');

  const packageBin = resolveInstalledPackageBin();
  checks.push('repo-local package/bin resolution');
  if (packageBin) {
    return { ...packageBin, checks };
  }

  const devFallbackBin = resolveDevFallbackBin();
  checks.push(`dev fallback path (${DEV_FALLBACK_ROOT})`);
  if (devFallbackBin) {
    return { ...devFallbackBin, checks };
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
  console.error(`  3) (Dev-only temporary fallback) ensure ${DEV_FALLBACK_ROOT} contains a runnable Playbook checkout.`);
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
