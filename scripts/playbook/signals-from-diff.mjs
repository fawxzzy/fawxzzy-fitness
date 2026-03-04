#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateSmartSignal } from '../../Playbook/tools/engine/signals.mjs';

const DEFAULT_MAPPING_PATH = 'tools/playbook/signals-map.json';

function runGit(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function safeGit(args, cwd) {
  try {
    return runGit(args, cwd);
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  const options = {
    staged: true,
    base: null,
    head: null,
    mapping: DEFAULT_MAPPING_PATH,
    changedFiles: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base') {
      options.base = argv[i + 1] ?? null;
      options.staged = false;
      i += 1;
      continue;
    }
    if (token === '--head') {
      options.head = argv[i + 1] ?? null;
      options.staged = false;
      i += 1;
      continue;
    }
    if (token === '--mapping') {
      options.mapping = argv[i + 1] ?? options.mapping;
      i += 1;
      continue;
    }
    if (token === '--changed-files') {
      const raw = argv[i + 1] ?? '';
      options.changedFiles = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      i += 1;
    }
  }

  return options;
}

function resolveRepoRoot(cwd) {
  const root = safeGit(['rev-parse', '--show-toplevel'], cwd);
  return root || cwd;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readChangedFiles({ staged, base, head, changedFiles }, cwd) {
  if (Array.isArray(changedFiles)) {
    return [...new Set(changedFiles.map((item) => item.replace(/\\/g, '/')).filter(Boolean))].sort();
  }

  if (staged) {
    const output = safeGit(['diff', '--name-only', '--cached', '--diff-filter=ACMRTUXB'], cwd);
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  if (base && head) {
    const output = safeGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...${head}`], cwd);
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  if (base) {
    const output = safeGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}..HEAD`], cwd);
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  const output = safeGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD~1..HEAD'], cwd);
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function toPlaybookPath(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('Playbook/')) return filePath;
  if (filePath.startsWith('docs/')) return `Playbook/${filePath}`;
  return filePath;
}

function mapSignalType(signalType, typeMap = {}) {
  if (typeMap[signalType]) return typeMap[signalType];
  if (signalType === 'Architecture Contract') return 'Guardrail';
  if (signalType === 'Failure Mode') return 'Guardrail';
  if (signalType === 'Pattern') return 'Pattern';
  if (signalType === 'Principle') return 'Principle';
  return 'Practice';
}

function firstMatchingOverride(changedFiles, overrides = []) {
  return overrides.find((override) => {
    const patterns = Array.isArray(override.match) ? override.match : [];
    return patterns.some((prefix) => changedFiles.some((file) => file === prefix || file.startsWith(prefix)));
  });
}

function applyMapping(signal, changedFiles, mapping) {
  const override = firstMatchingOverride(changedFiles, mapping.pathOverrides);
  const mappedType = override?.type || mapSignalType(signal.type, mapping.typeMap);

  const configuredPath = override?.suggestedPlaybookFile
    || mapping.suggestedPlaybookFileMap?.[signal.suggestedPlaybookFile]
    || signal.suggestedPlaybookFile;

  return {
    ...signal,
    type: mappedType,
    suggestedPlaybookFile: toPlaybookPath(configuredPath),
  };
}

export function getSignalsFromDiff(options = {}) {
  const cwd = options.cwd || process.cwd();
  const parsed = options.argv ? parseArgs(options.argv) : {
    staged: options.staged ?? true,
    base: options.base ?? null,
    head: options.head ?? null,
    mapping: options.mapping || DEFAULT_MAPPING_PATH,
    changedFiles: options.changedFiles ?? null,
  };

  const repoRoot = resolveRepoRoot(cwd);
  const mappingPath = path.resolve(repoRoot, parsed.mapping || DEFAULT_MAPPING_PATH);
  const rawMapping = readJson(mappingPath) || {};
  const mapping = {
    typeMap: rawMapping.typeMap || {},
    suggestedPlaybookFileMap: rawMapping.suggestedPlaybookFileMap || {},
    pathOverrides: rawMapping.pathOverrides || [],
  };

  const changedFiles = readChangedFiles(parsed, repoRoot);
  const commitMessage = safeGit(['log', '-1', '--pretty=%s'], repoRoot);
  const branchName = safeGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);

  const signal = generateSmartSignal({
    cwd: path.resolve(repoRoot, 'Playbook'),
    changedFiles,
    commitMessage,
    branchName,
  });

  const mapped = applyMapping(signal, changedFiles, mapping);

  return {
    ...mapped,
    changedFiles,
    mappingPath: fs.existsSync(mappingPath) ? path.relative(repoRoot, mappingPath).replace(/\\/g, '/') : null,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = getSignalsFromDiff({ argv: process.argv.slice(2) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
