#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MODE = {
  SUBMODULE: 'SUBMODULE',
  SIBLING_REPO_IN_TREE: 'SIBLING_REPO_IN_TREE',
  EXTERNAL_REPO: 'EXTERNAL_REPO',
  MISSING: 'MISSING',
};

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function isGitRepo(repoPath) {
  try {
    const output = execFileSync('git', ['-C', repoPath, 'rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output === 'true';
  } catch {
    return false;
  }
}

function parseGitmodulesForPlaybook(gitmodulesPath) {
  if (!exists(gitmodulesPath)) return false;
  const content = fs.readFileSync(gitmodulesPath, 'utf8');

  const blocks = content.split(/\n(?=\[submodule\s+")/g);
  return blocks.some((block) => {
    const header = block.match(/^\[submodule\s+"([^"]+)"\]/m)?.[1]?.trim();
    const submodulePath = block.match(/^\s*path\s*=\s*(.+)$/m)?.[1]?.trim();
    return header === 'Playbook' || submodulePath === 'Playbook';
  });
}

export function getPlaybookIntegration() {
  const cwd = process.cwd();
  const inTreePath = path.resolve(cwd, 'Playbook');
  const gitmodulesPath = path.resolve(cwd, '.gitmodules');

  if (parseGitmodulesForPlaybook(gitmodulesPath)) {
    return {
      mode: MODE.SUBMODULE,
      repoPath: inTreePath,
      label: 'Playbook submodule at ./Playbook',
    };
  }

  if (exists(inTreePath) && isGitRepo(inTreePath)) {
    return {
      mode: MODE.SIBLING_REPO_IN_TREE,
      repoPath: inTreePath,
      label: 'Git repo detected at ./Playbook',
    };
  }

  const envPathRaw = process.env.PLAYBOOK_REPO_PATH?.trim();
  if (envPathRaw) {
    const envPath = path.resolve(cwd, envPathRaw);
    if (exists(envPath) && isGitRepo(envPath)) {
      return {
        mode: MODE.EXTERNAL_REPO,
        repoPath: envPath,
        label: `External Playbook repo at ${envPath}`,
      };
    }
  }

  return {
    mode: MODE.MISSING,
    repoPath: null,
    label: 'Playbook repository integration missing',
  };
}

export function getPlaybookMissingInstructions() {
  return [
    'Playbook integration is missing.',
    'Setup options:',
    '1) Add Playbook as submodule: git submodule add <playbook-repo-url> Playbook',
    '2) Or clone Playbook at ./Playbook (or adjacent) as a git repo',
    '3) If using an external path, set PLAYBOOK_REPO_PATH=/absolute/or/relative/path/to/Playbook',
  ].join('\n');
}

export { MODE };
