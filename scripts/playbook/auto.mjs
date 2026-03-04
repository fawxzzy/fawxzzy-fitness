#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  return {
    skipSync: argv.includes('--skip-sync'),
    skipPlaybookCommit: argv.includes('--skip-playbook-commit'),
    skipSubtreeSync: argv.includes('--skip-subtree-sync'),
    skipMainCommit: argv.includes('--skip-main-commit'),
    force: argv.includes('--force'),
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    cwd: options.cwd ?? process.cwd(),
  });

  if (result.status !== 0) {
    const rendered = [command, ...args].join(' ');
    throw new Error(`Command failed (${rendered}) with exit code ${result.status ?? 'unknown'}.`);
  }
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: false,
    cwd: options.cwd ?? process.cwd(),
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function isDirty(cwd) {
  const status = tryRun('git', ['status', '--porcelain'], { cwd });
  if (!status.ok) return false;
  return status.stdout.trim().length > 0;
}

function gitRoot(cwd) {
  const result = tryRun('git', ['rev-parse', '--show-toplevel'], { cwd });
  return result.ok ? result.stdout.trim() : null;
}

function readChangedFiles(cwd) {
  const status = tryRun('git', ['status', '--porcelain'], { cwd });
  if (!status.ok || status.stdout.trim().length === 0) {
    return [];
  }

  const diff = tryRun('git', ['diff', '--name-only', 'HEAD'], { cwd });
  if (!diff.ok) {
    return [];
  }

  return diff.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function loadPackageScripts() {
  try {
    const raw = await fs.readFile(path.resolve('package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.scripts ?? {};
  } catch {
    return {};
  }
}

function commitIfDirty(cwd, message) {
  if (!isDirty(cwd)) {
    console.log(`No changes to commit in ${cwd}.`);
    return;
  }

  run('git', ['add', '-A'], { cwd });
  run('git', ['commit', '-m', message], { cwd });
}

function shouldRunUpdate(changedFiles, force) {
  if (force) {
    return true;
  }

  const hasDocsOrPlaybookChanges = changedFiles.some(
    (file) => file.startsWith('docs/') || file.startsWith('Playbook/')
  );

  if (!hasDocsOrPlaybookChanges) {
    return false;
  }

  const hasNotesChanges = changedFiles.includes('docs/PLAYBOOK_NOTES.md');
  if (!hasNotesChanges) {
    return false;
  }

  return true;
}

function printPlan(changedFiles, phases) {
  console.log(`Detected changed files: ${changedFiles.length}`);
  console.log(`Running phases: ${phases.join('/')}`);
}

async function runOptionalSubtreeSync() {
  const scripts = await loadPackageScripts();

  if (typeof scripts['sync-playbook'] === 'string') {
    console.log('Running npm run sync-playbook ...');
    run('npm', ['run', 'sync-playbook']);
    return;
  }

  if (typeof scripts['playbook:subtree'] === 'string') {
    console.log('Running npm run playbook:subtree ...');
    run('npm', ['run', 'playbook:subtree']);
    return;
  }

  console.log('Attempting optional git sync-playbook ...');
  const result = tryRun('git', ['sync-playbook']);
  if (!result.ok) {
    console.warn('Warning: git sync-playbook not available or failed. Continuing.');
    if (result.stderr.trim().length > 0) {
      console.warn(result.stderr.trim());
    }
    return;
  }

  if (result.stdout.trim().length > 0) {
    console.log(result.stdout.trim());
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const playbookPath = path.resolve(root, 'Playbook');
  const changedFiles = readChangedFiles(root);
  const runUpdate = shouldRunUpdate(changedFiles, args.force);

  const phases = [
    args.skipSync ? 'sync(skipped)' : 'sync',
    'playbook',
    runUpdate ? 'update' : 'update(skipped)',
    args.skipPlaybookCommit ? 'commit(skipped)' : 'commit',
    args.skipSubtreeSync ? 'subtree(skipped)' : 'subtree',
    args.skipMainCommit ? 'main-commit(skipped)' : 'main-commit',
  ];
  printPlan(changedFiles, phases);

  if (!args.skipSync) {
    run('npm', ['run', 'playbook:sync']);
  }

  run('npm', ['run', 'playbook']);

  if (runUpdate) {
    run('npm', ['run', 'playbook:update']);
  } else {
    console.log('Skipping playbook:update (no qualifying docs/Playbook + PLAYBOOK_NOTES changes detected). Use --force to run anyway.');
  }

  if (!args.skipPlaybookCommit) {
    const mainRoot = gitRoot(root);
    const playbookRoot = gitRoot(playbookPath);

    if (playbookRoot && mainRoot && playbookRoot !== mainRoot) {
      commitIfDirty(playbookPath, 'chore(playbook): update promoted notes and governance docs');
    } else {
      console.log('Playbook/ is not a separate git repository; skipping Playbook repo commit step.');
    }
  }

  if (!args.skipSubtreeSync) {
    await runOptionalSubtreeSync();
  }

  if (!args.skipMainCommit) {
    commitIfDirty(root, 'chore(playbook): run playbook automation');
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
