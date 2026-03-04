#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const CONTRACTS_PATH = path.resolve('docs/contracts.json');
const SRC_ROOT = path.resolve('src');

const IMPORT_PATTERN = /(?:import\s+[^'"\n]+?\s+from\s*|import\s*\(\s*|export\s+[^'"\n]+?\s+from\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
const LOCAL_RESOLVE_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const LOCAL_INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mjs', 'index.cjs'];

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegex(pattern) {
  const escaped = escapeRegex(toPosix(pattern)).replace(/\*\*/g, '::DOUBLE_STAR::').replace(/\*/g, '[^/]*').replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAny(patterns, value) {
  return patterns.some((pattern) => globToRegex(pattern).test(value));
}

function walkFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile()) {
        files.push(full);
      }
    }
  }

  return files.sort();
}

function extractImports(fileContent) {
  const imports = [];
  for (const match of fileContent.matchAll(IMPORT_PATTERN)) {
    imports.push(match[1]);
  }
  return imports;
}

function resolveImportPath(filePath, specifier) {
  const normalized = toPosix(specifier);
  if (normalized.startsWith('@/')) {
    return normalized.replace(/^@\//, 'src/');
  }

  if (normalized.startsWith('./') || normalized.startsWith('../')) {
    const fromDir = path.dirname(filePath);
    const absBase = path.resolve(fromDir, normalized);
    const absFile = resolveLocalPath(absBase);
    if (!absFile) {
      return null;
    }
    return toPosix(path.relative(process.cwd(), absFile));
  }

  return normalized;
}

function resolveLocalPath(absBase) {
  if (existsSync(absBase) && statSync(absBase).isFile()) {
    return absBase;
  }

  for (const ext of LOCAL_RESOLVE_EXTENSIONS) {
    const candidate = `${absBase}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  for (const indexFile of LOCAL_INDEX_FILES) {
    const candidate = path.join(absBase, indexFile);
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function checkImportsContract(contract, allFiles) {
  const matchFrom = contract.match_from || [];
  const exclude = contract.exclude || [];
  const forbid = contract.forbid_imports || [];
  const violations = [];

  for (const absFile of allFiles) {
    const relFile = toPosix(path.relative(process.cwd(), absFile));
    if (!matchesAny(matchFrom, relFile)) {
      continue;
    }
    if (exclude.length > 0 && matchesAny(exclude, relFile)) {
      continue;
    }

    const content = readFileSync(absFile, 'utf8');
    const imports = extractImports(content);

    for (const specifier of imports) {
      const resolved = resolveImportPath(absFile, specifier);
      if (!resolved) {
        continue;
      }

      if (matchesAny(forbid, resolved)) {
        violations.push({ file: relFile, importPath: specifier });
      }
    }
  }

  return violations;
}

function git(args) {
  return execSync(`git ${args.join(' ')}`, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function checkChangelogDiscipline() {
  if (!process.env.CI) {
    console.log('SKIP changelog-discipline (CI only)');
    return { warnings: [] };
  }

  let range = null;
  const base = process.env.GITHUB_BASE_REF;
  try {
    if (base) {
      git(['rev-parse', '--verify', `origin/${base}`]);
      range = `origin/${base}...HEAD`;
    } else {
      git(['rev-parse', '--verify', 'HEAD~1']);
      range = 'HEAD~1..HEAD';
    }
  } catch {
    console.log('WARN changelog-discipline (unable to determine git diff range)');
    return { warnings: [] };
  }

  const changed = git(['diff', '--name-only', range]).split('\n').map((line) => line.trim()).filter(Boolean);

  const changedSrc = changed.some((file) => file.startsWith('src/'));
  const changedChangelog = changed.includes('docs/CHANGELOG.md');

  if (changedSrc && !changedChangelog) {
    console.log('WARN changelog-discipline');
    console.log('file: docs/CHANGELOG.md');
    console.log('detail: src/** changed in CI diff but changelog was not updated');
    return { warnings: ['changelog-discipline'] };
  }

  console.log('OK   changelog-discipline');
  return { warnings: [] };
}

function main() {
  if (!existsSync(CONTRACTS_PATH)) {
    console.error('Missing docs/contracts.json. Run: npm run contracts:gen');
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(CONTRACTS_PATH, 'utf8'));
  const contracts = Array.isArray(payload.contracts) ? payload.contracts : [];
  const files = walkFiles(SRC_ROOT);

  console.log('Contracts check');
  console.log('');

  let failCount = 0;
  for (const contract of contracts) {
    if (contract.type === 'imports') {
      const violations = checkImportsContract(contract, files);
      if (violations.length === 0) {
        console.log(`OK   ${contract.id}`);
        continue;
      }

      for (const violation of violations) {
        const status = contract.severity === 'fail' ? 'FAIL' : 'WARN';
        if (status === 'FAIL') {
          failCount += 1;
        }
        console.log(`${status} ${contract.id}`);
        console.log(`file: ${violation.file}`);
        console.log(`import: ${violation.importPath}`);
      }
      continue;
    }

    if (contract.id === 'changelog-discipline') {
      checkChangelogDiscipline();
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main();
