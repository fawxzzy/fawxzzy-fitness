#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  deriveStableId,
  makePlaybookSection,
  parsePlaybookNotes,
  resolvePlaybookDestination,
  upsertMarkedSection,
} from './notes-utils.mjs';

const NOTES_PATH = path.resolve('docs/PLAYBOOK_NOTES.md');

function parseArgs(argv) {
  const args = { commit: false, commitMessage: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--commit') args.commit = true;
    if (token === '--commit-message') {
      args.commitMessage = argv[index + 1] ?? null;
      index += 1;
    }
  }
  return args;
}

async function resolvePlaybookRepoPath() {
  const candidates = [];
  if (process.env.PLAYBOOK_REPO_PATH) {
    candidates.push(path.resolve(process.cwd(), process.env.PLAYBOOK_REPO_PATH));
  }
  candidates.push(path.resolve(process.cwd(), '../Playbook'));
  candidates.push(path.resolve(process.cwd(), './Playbook'));

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // continue
    }
  }

  throw new Error('Playbook repo not found. Set PLAYBOOK_REPO_PATH or clone to ../Playbook.');
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function isGitRepoClean(cwd) {
  try {
    git(cwd, ['rev-parse', '--is-inside-work-tree']);
    return git(cwd, ['status', '--porcelain']).length === 0;
  } catch {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const playbookRepoPath = await resolvePlaybookRepoPath();
  const notesOriginal = await fs.readFile(NOTES_PATH, 'utf8');
  const parsed = parsePlaybookNotes(notesOriginal);

  const proposedEntries = parsed.entries
    .filter((entry) => entry.fields.Status === 'Proposed')
    .sort((a, b) => b.startLine - a.startLine);

  if (proposedEntries.length === 0) {
    console.log('No Proposed entries found in docs/PLAYBOOK_NOTES.md. Nothing to promote.');
    return;
  }

  if (options.commit && (!isGitRepoClean(process.cwd()) || !isGitRepoClean(playbookRepoPath))) {
    throw new Error('--commit requires clean git working trees in both repositories.');
  }

  const touchedPlaybookFiles = new Set();
  const notesLines = [...parsed.lines];

  for (const entry of proposedEntries) {
    const destinationRelativePath = resolvePlaybookDestination(entry.fields['Suggested Playbook File']);
    const destinationAbsolutePath = path.resolve(playbookRepoPath, destinationRelativePath);

    await fs.mkdir(path.dirname(destinationAbsolutePath), { recursive: true });

    const marker = deriveStableId(entry.date, entry.title);
    const section = makePlaybookSection(entry);

    const existingContent = (await fileExists(destinationAbsolutePath))
      ? await fs.readFile(destinationAbsolutePath, 'utf8')
      : '# Promoted Notes from FawxzzyFitness\n';

    const nextContent = upsertMarkedSection(existingContent, marker, section);
    if (nextContent !== existingContent) {
      await fs.writeFile(destinationAbsolutePath, nextContent, 'utf8');
      touchedPlaybookFiles.add(destinationAbsolutePath);
    }

    const statusLineIndex = entry.fieldLineIndexes.Status;
    if (statusLineIndex !== undefined) {
      notesLines[statusLineIndex] = notesLines[statusLineIndex].replace(/(\-\s*Status:\s*).*/, '$1Promoted');
    }

    const upstreamLineIndex = entry.fieldLineIndexes.Upstream;
    if (upstreamLineIndex !== undefined) {
      notesLines[upstreamLineIndex] = notesLines[upstreamLineIndex].replace(/(\-\s*Upstream:\s*).*/, '$1Local (pending PR)');
    } else {
      const insertionIndex = statusLineIndex !== undefined ? statusLineIndex + 1 : entry.endLine + 1;
      notesLines.splice(insertionIndex, 0, '- Upstream: Local (pending PR)');
    }
  }

  const notesNext = `${notesLines.join('\n').replace(/\s*$/, '')}\n`;
  if (notesNext !== notesOriginal) {
    await fs.writeFile(NOTES_PATH, notesNext, 'utf8');
  }

  console.log(`Promoted ${proposedEntries.length} note(s).`);

  if (options.commit) {
    const commitMessage = options.commitMessage ?? 'chore(playbook): promote local notes into playbook docs';
    if (touchedPlaybookFiles.size > 0) {
      const relPaths = [...touchedPlaybookFiles].map((abs) => path.relative(playbookRepoPath, abs));
      git(playbookRepoPath, ['add', ...relPaths]);
      try {
        git(playbookRepoPath, ['commit', '-m', commitMessage]);
      } catch {
        console.log('Playbook repo: no commit created (no staged changes).');
      }
    }
    git(process.cwd(), ['add', path.relative(process.cwd(), NOTES_PATH)]);
    try {
      git(process.cwd(), ['commit', '-m', commitMessage]);
    } catch {
      console.log('FawxzzyFitness repo: no commit created (no staged changes).');
    }
    console.log('Created local commits in both repositories (if changes existed). No push performed.');
    return;
  }

  console.log('Next steps:');
  console.log('1) Review docs/PLAYBOOK_NOTES.md and updated Playbook docs.');
  console.log('2) Commit manually, or rerun with --commit for local commits in both repos.');
  console.log('3) Open PRs as needed (script never pushes).');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
