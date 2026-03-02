#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const today = new Date().toISOString().slice(0,10);
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ARCHIVE = args.has('--archive');
const INCLUDE_BUILD_CACHE = args.has('--include-build-cache');

const targets = [
  'artifacts/icon-audit',
  'icon-missing-backfill-report.md',
  'icon-sync-report.md',
  'docs/icon-audit-report.md',
  'codex.patch',
];
if (INCLUDE_BUILD_CACHE) targets.push('.next');

async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

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

async function main() {
  const archiveRoot = path.join(ROOT, 'docs', '_archive', `cleanup-${today}`);
  const plan = [];

  for (const rel of targets) {
    const abs = path.join(ROOT, rel);
    if (!(await exists(abs))) continue;
    const bytes = await sizeOf(abs);
    const action = ARCHIVE ? 'archive' : 'delete';
    plan.push({ rel, abs, bytes, action });
  }

  if (plan.length === 0) {
    console.log('Nothing to clean.');
    return;
  }

  console.log('Cleanup plan:');
  for (const item of plan) {
    console.log(` - ${item.action.toUpperCase()}: ${item.rel} (${await humanSize(item.bytes)})`);
  }

  if (DRY_RUN) {
    console.log('\nDry run only. No changes made.');
    return;
  }

  if (ARCHIVE) await ensureDir(archiveRoot);

  for (const item of plan) {
    if (ARCHIVE) {
      const dest = path.join(archiveRoot, item.rel.replace(/[/\\]/g, '__'));
      await fs.rename(item.abs, dest).catch(async () => {
        // Cross-device or existing dest fallback: copy then remove
        const { default: fse } = await import('fs-extra');
        await fse.copy(item.abs, dest, { overwrite: true });
        await fse.remove(item.abs);
      });
      console.log(`Archived: ${item.rel}`);
    } else {
      // Delete
      await fs.rm(item.abs, { recursive: true, force: true });
      console.log(`Deleted: ${item.rel}`);
    }
  }

  console.log(`\nDone. ${ARCHIVE ? 'Archive at: ' + archiveRoot : 'Removed selected files.'}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
