#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listActiveRecordedDevServers, readRepoLocalNextProcesses } from './next-workspace-guard.mjs';

const ROOT = process.cwd();
const today = new Date().toISOString().slice(0,10);
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const DRY_RUN = args.has('--dry-run');
const ARCHIVE = args.has('--archive');
const INCLUDE_BUILD_CACHE = args.has('--include-build-cache');
const INCLUDE_NODE_MODULES = args.has('--include-node-modules');
const INCLUDE_PLAYBOOK_STATE = args.has('--include-playbook-state');
const ONLY_BUILD_CACHE = args.has('--only-build-cache');
const RELOCATE_TO_TMP = args.has('--relocate-to-tmp');
const ALLOW_LIVE_DEV_CLEANUP = args.has('--allow-live-dev-cleanup');
const reportPathArgIndex = rawArgs.indexOf('--report-path');
const REPORT_PATH = reportPathArgIndex >= 0 ? rawArgs[reportPathArgIndex + 1] : null;
const DEV_GUARDED_TARGETS = new Set(['.next', 'node_modules']);

const targets = ONLY_BUILD_CACHE
  ? []
  : [
      'artifacts/icon-audit',
      'icon-missing-backfill-report.md',
      'icon-sync-report.md',
      'docs/icon-audit-report.md',
      'codex.patch',
    ];
if (INCLUDE_BUILD_CACHE || ONLY_BUILD_CACHE) targets.push('.next');
if (INCLUDE_NODE_MODULES) targets.push('node_modules');
if (INCLUDE_PLAYBOOK_STATE) targets.push('.playbook');

async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

async function writeReport(report) {
  if (!REPORT_PATH) return;
  const reportPath = path.resolve(ROOT, REPORT_PATH);
  await ensureDir(path.dirname(reportPath));
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function cleanupRelocationRoot() {
  return path.resolve(ROOT, '..', '..', 'tmp', 'repo-cleanup', path.basename(ROOT), today);
}

function formatActiveDevServerLabel(server) {
  const pidLabel = Number.isInteger(server?.pid) ? `pid ${server.pid}` : 'pid unknown';
  const portLabel = Number.isInteger(server?.port) ? `port ${server.port}` : null;
  const sourceLabel = typeof server?.source === 'string' && server.source ? server.source : null;
  return [pidLabel, portLabel, sourceLabel].filter(Boolean).join(' @ ');
}

async function readActiveRepoDevServers() {
  const recorded = await listActiveRecordedDevServers().catch(() => []);
  if (recorded.length > 0) {
    return recorded.map((server) => ({
      pid: Number.isInteger(server?.pid) ? server.pid : null,
      port: Number.isInteger(server?.port) ? server.port : null,
      source: 'recorded-dev-server',
    }));
  }

  const repoLocalProcesses = await readRepoLocalNextProcesses().catch(() => []);
  return repoLocalProcesses.map((processInfo) => ({
    pid: Number.isInteger(processInfo?.pid) ? processInfo.pid : null,
    port: null,
    source: 'repo-local-next-process',
  }));
}

async function humanSize(bytes) {
  const units = ['B','KB','MB','GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(2)} ${units[i]}`;
}

async function sizeOf(p) {
  try {
    const st = await fs.stat(p);
    if (st.isFile()) return st.size;
    if (st.isDirectory()) {
      let total = 0;
      const stack = [p];
      while (stack.length) {
        const cur = stack.pop();
        const entries = await fs.readdir(cur, { withFileTypes: true });
        for (const e of entries) {
          const ap = path.join(cur, e.name);
          if (e.isFile()) total += (await fs.stat(ap)).size;
          else if (e.isDirectory()) stack.push(ap);
        }
      }
      return total;
    }
  } catch { /* ignore */ }
  return 0;
}

async function relocateIntoTmp(item) {
  const baseRoot = cleanupRelocationRoot();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetRoot = path.join(baseRoot, stamp);
  const dest = path.join(targetRoot, item.rel.replace(/[/\\]/g, '__'));
  await ensureDir(path.dirname(dest));
  await fs.rename(item.abs, dest);
  return dest;
}

async function removePath(abs) {
  try {
    await fs.rm(abs, {
      recursive: true,
      force: true,
      maxRetries: 2,
      retryDelay: 200,
    });
  } catch (error) {
    if (!isDirectoryNotEmptyError(error)) throw error;
    await prunePathResidue(abs);
    await fs.rm(abs, {
      recursive: true,
      force: true,
      maxRetries: 2,
      retryDelay: 200,
    });
  }
}

function isActiveLockError(error) {
  if (!error || typeof error !== 'object') return false;
  return error.code === 'EPERM' || error.code === 'EBUSY';
}

function isDirectoryNotEmptyError(error) {
  if (!error || typeof error !== 'object') return false;
  return error.code === 'ENOTEMPTY';
}

async function prunePathResidue(abs) {
  const stats = await fs.stat(abs).catch(() => null);
  if (!stats) return;
  if (!stats.isDirectory()) {
    await fs.rm(abs, { force: true });
    return;
  }
  const entries = await fs.readdir(abs, { withFileTypes: true });
  for (const entry of entries) {
    const entryAbs = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      await prunePathResidue(entryAbs);
      await fs.rm(entryAbs, {
        recursive: true,
        force: true,
        maxRetries: 2,
        retryDelay: 200,
      }).catch(() => {});
      continue;
    }
    await fs.rm(entryAbs, {
      force: true,
      maxRetries: 2,
      retryDelay: 200,
    }).catch(() => {});
  }
}

async function main() {
  const archiveRoot = path.join(ROOT, 'docs', '_archive', `cleanup-${today}`);
  const activeRepoDevServers = ALLOW_LIVE_DEV_CLEANUP ? [] : await readActiveRepoDevServers();
  const plan = [];
  const report = {
    contract_version: 'atlas.repo.generated-state-cleanup.report.v1',
    generated_at: new Date().toISOString(),
    repo_name: path.basename(ROOT),
    status: 'clean',
    planned_paths: [],
    cleaned_paths: [],
    archived_paths: [],
    relocated_paths: [],
    retained_paths: [],
  };

  for (const rel of targets) {
    const abs = path.join(ROOT, rel);
    if (!(await exists(abs))) continue;
    const bytes = await sizeOf(abs);
    const action = ARCHIVE ? 'archive' : 'delete';
    plan.push({ rel, abs, bytes, action });
  }
  report.planned_paths = plan.map((item) => item.rel);

  if (plan.length === 0) {
    await writeReport(report);
    console.log('Nothing to clean.');
    return;
  }

  console.log('Cleanup plan:');
  for (const item of plan) {
    console.log(` - ${item.action.toUpperCase()}: ${item.rel} (${await humanSize(item.bytes)})`);
  }

  if (DRY_RUN) {
    report.status = 'dry_run';
    await writeReport(report);
    console.log('\nDry run only. No changes made.');
    return;
  }

  if (ARCHIVE) await ensureDir(archiveRoot);

  for (const item of plan) {
    if (activeRepoDevServers.length > 0 && DEV_GUARDED_TARGETS.has(item.rel)) {
      const activeSummary = activeRepoDevServers.map(formatActiveDevServerLabel).join(', ');
      report.retained_paths.push({
        path: item.rel,
        reason: 'active_dev_server',
        active_dev_servers: activeRepoDevServers,
        suppress_validation_warning: true,
      });
      console.log(`Retained active dev path: ${item.rel} (${activeSummary})`);
      continue;
    }

    if (ARCHIVE) {
      const dest = path.join(archiveRoot, item.rel.replace(/[/\\]/g, '__'));
      await fs.rename(item.abs, dest).catch(async () => {
        // Cross-device or existing dest fallback: copy then remove
        const { default: fse } = await import('fs-extra');
        await fse.copy(item.abs, dest, { overwrite: true });
        await fse.remove(item.abs);
      });
      report.archived_paths.push(item.rel);
      console.log(`Archived: ${item.rel}`);
    } else {
      const shouldPreferRelocation = RELOCATE_TO_TMP && item.rel === 'node_modules';
      if (shouldPreferRelocation) {
        try {
          const relocated = await relocateIntoTmp(item);
          report.relocated_paths.push({ path: item.rel, destination: path.relative(ROOT, relocated) });
          console.log(`Relocated: ${item.rel} -> ${path.relative(ROOT, relocated)}`);
        } catch {
          try {
            await removePath(item.abs);
            report.cleaned_paths.push(item.rel);
            console.log(`Deleted after relocate fallback: ${item.rel}`);
          } catch (error) {
            if (!isActiveLockError(error)) {
              throw error;
            }
            report.retained_paths.push({
              path: item.rel,
              reason: 'active_lock',
              error_code: error.code ?? null,
              error_message: error.message ?? String(error),
              suppress_validation_warning: true,
            });
            console.log(`Retained active-lock path: ${item.rel}`);
          }
        }
        continue;
      }

      try {
        await removePath(item.abs);
        report.cleaned_paths.push(item.rel);
        console.log(`Deleted: ${item.rel}`);
      } catch (error) {
        if (!RELOCATE_TO_TMP) {
          throw error;
        }
        try {
          const relocated = await relocateIntoTmp(item);
          report.relocated_paths.push({ path: item.rel, destination: path.relative(ROOT, relocated) });
          console.log(`Relocated after delete retry: ${item.rel} -> ${path.relative(ROOT, relocated)}`);
        } catch {
          if (!isActiveLockError(error)) {
            throw error;
          }
          report.retained_paths.push({
            path: item.rel,
            reason: 'active_lock',
            error_code: error.code ?? null,
            error_message: error.message ?? String(error),
            suppress_validation_warning: true,
          });
          console.log(`Retained active-lock path: ${item.rel}`);
        }
      }
    }
  }

  report.status = report.retained_paths.length > 0 ? 'retained_active_lock' : 'cleaned';
  await writeReport(report);
  const completionSummary = ARCHIVE
    ? `Archive at: ${archiveRoot}`
    : report.retained_paths.length > 0
      ? 'Retained active dev paths; no guarded runtime state was removed.'
      : 'Removed selected files.';
  console.log(`\nDone. ${completionSummary}`);
}

main().catch(async (err) => {
  const report = {
    contract_version: 'atlas.repo.generated-state-cleanup.report.v1',
    generated_at: new Date().toISOString(),
    repo_name: path.basename(ROOT),
    status: 'failed',
    planned_paths: [],
    cleaned_paths: [],
    archived_paths: [],
    relocated_paths: [],
    retained_paths: [],
    error_code: err?.code ?? null,
    error_message: err?.message ?? String(err),
  };
  await writeReport(report);
  console.error(err);
  process.exit(1);
});
