#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { getPlaybookIntegration, getPlaybookMissingInstructions, MODE } from './playbook-path.mjs';

function parseArgs(argv) {
  const args = { commit: false, message: 'chore(playbook): sync Playbook to latest' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--commit') args.commit = true;
    if (token === '--message') {
      args.message = argv[index + 1] ?? args.message;
      index += 1;
    }
  }
  return args;
}

function git(args, cwd = process.cwd()) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function isCleanRepo(cwd) {
  return git(['status', '--porcelain'], cwd) === '';
}

function runGit(args, cwd = process.cwd()) {
  console.log(`> git ${args.join(' ')}`);
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function getDefaultBranch(repoPath) {
  try {
    const ref = git(['symbolic-ref', 'refs/remotes/origin/HEAD'], repoPath);
    return ref.split('/').at(-1) || 'main';
  } catch {
    return 'main';
  }
}

function syncSubmodule(playbookPath) {
  runGit(['submodule', 'sync', '--recursive']);
  runGit(['submodule', 'update', '--init', '--recursive']);
  runGit(['submodule', 'update', '--remote', '--merge', '--recursive']);
  return git(['rev-parse', 'HEAD'], playbookPath);
}

function syncRepo(playbookPath) {
  runGit(['fetch', '--all', '--prune'], playbookPath);
  const branch = getDefaultBranch(playbookPath);
  runGit(['checkout', branch], playbookPath);
  runGit(['pull', '--ff-only'], playbookPath);
  return git(['rev-parse', 'HEAD'], playbookPath);
}

function hasStagedOrWorkingDiff() {
  const status = git(['status', '--porcelain']);
  return status.length > 0;
}

function commitIfRequested(message) {
  if (!hasStagedOrWorkingDiff()) {
    console.log('No FawxzzyFitness changes to commit after sync.');
    return;
  }
  runGit(['add', '-A']);
  runGit(['commit', '-m', message]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const integration = getPlaybookIntegration();

  if (integration.mode === MODE.MISSING || !integration.repoPath) {
    console.error(getPlaybookMissingInstructions());
    process.exit(1);
  }

  if (!isCleanRepo(integration.repoPath)) {
    console.error(`Playbook working tree is dirty (${integration.repoPath}). Commit/stash changes before syncing.`);
    process.exit(1);
  }

  if (integration.mode === MODE.SUBMODULE && !isCleanRepo(process.cwd())) {
    console.error('FawxzzyFitness working tree is dirty. SUBMODULE sync updates git index; commit/stash first.');
    process.exit(1);
  }

  let sha = '';
  if (integration.mode === MODE.SUBMODULE) {
    sha = syncSubmodule(path.resolve(process.cwd(), 'Playbook'));
  } else {
    sha = syncRepo(integration.repoPath);
  }

  console.log(`Playbook mode: ${integration.mode}`);
  console.log(`Playbook HEAD: ${sha}`);

  if (args.commit) {
    commitIfRequested(args.message);
  }
}

main();
