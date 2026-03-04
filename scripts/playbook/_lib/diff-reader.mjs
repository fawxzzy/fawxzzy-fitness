import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    base: null,
    pr: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--base') {
      args.base = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--pr') {
      args.pr = true;
    }
  }

  return args;
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function determineRange({ base, pr }) {
  if (pr) {
    const baseBranch = base || process.env.GITHUB_BASE_REF || process.env.BASE_BRANCH || 'main';
    return `origin/${baseBranch}...HEAD`;
  }

  if (base) {
    return `${base}..HEAD`;
  }

  return 'HEAD~1..HEAD';
}

function changedFiles(range) {
  const output = runGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', range]);
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function unifiedDiff(range) {
  return runGit(['diff', range, '--unified=2']);
}

function splitDiffByFile(diff) {
  const lines = diff.split(/\r?\n/);
  const perFile = new Map();
  let currentPath = null;
  let buffer = [];

  function flush() {
    if (currentPath) {
      perFile.set(currentPath, buffer.join('\n'));
    }
  }

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      flush();
      buffer = [line];
      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      currentPath = match ? match[2] : null;
      continue;
    }

    if (buffer.length > 0) {
      buffer.push(line);
    }
  }

  flush();
  return perFile;
}

export function readDiffContext(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const range = determineRange(args);
  const files = changedFiles(range);
  const diff = unifiedDiff(range);
  const fileDiffs = splitDiffByFile(diff);
  return { args, range, files, diff, fileDiffs };
}
