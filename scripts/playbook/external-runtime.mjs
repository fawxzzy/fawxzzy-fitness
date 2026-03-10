#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PLAYBOOK_DIR = '.playbook';
const RUNTIME_PATH = path.join(PLAYBOOK_DIR, 'runtime.json');
const INDEX_PATH = path.join(PLAYBOOK_DIR, 'repo-index.json');
const GRAPH_PATH = path.join(PLAYBOOK_DIR, 'repo-graph.json');

const DEFAULT_RUNTIME = {
  version: 1,
  mode: 'external',
  initialized: true,
};

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '.turbo']);

function ensurePlaybookDir(cwd) {
  const playbookDir = path.join(cwd, PLAYBOOK_DIR);
  fs.mkdirSync(playbookDir, { recursive: true });
  return playbookDir;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function writeJson(cwd, relativePath, payload) {
  const absolute = path.join(cwd, relativePath);
  const content = `${stableStringify(payload)}\n`;
  fs.writeFileSync(absolute, content, 'utf8');
  return absolute;
}

export function initExternalRuntime({ cwd = process.cwd() } = {}) {
  ensurePlaybookDir(cwd);
  writeJson(cwd, RUNTIME_PATH, DEFAULT_RUNTIME);
  return { runtimePath: path.join(cwd, RUNTIME_PATH) };
}

function walkFiles(rootDir, cwd, bucket) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    const relative = path.relative(cwd, absolute).replaceAll('\\\\', '/');

    if (!relative || relative === PLAYBOOK_DIR || relative.startsWith(`${PLAYBOOK_DIR}/`)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walkFiles(absolute, cwd, bucket);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase() || '<none>';
    const topLevelDir = relative.includes('/') ? relative.split('/')[0] : '<root>';

    bucket.files.push(relative);
    bucket.byExtension[extension] = (bucket.byExtension[extension] || 0) + 1;
    bucket.byTopLevel[topLevelDir] = (bucket.byTopLevel[topLevelDir] || 0) + 1;
  }
}

export function buildRepoIndex({ cwd = process.cwd() } = {}) {
  ensurePlaybookDir(cwd);
  const bucket = {
    version: 1,
    generatedBy: 'playbook-index',
    files: [],
    summary: {
      totalFiles: 0,
      byExtension: {},
      byTopLevel: {},
      hasDocs: false,
      hasTests: false,
      hasSupabase: false,
      hasAppOrSrc: false,
    },
  };

  walkFiles(cwd, cwd, {
    files: bucket.files,
    byExtension: bucket.summary.byExtension,
    byTopLevel: bucket.summary.byTopLevel,
  });

  bucket.files.sort((a, b) => a.localeCompare(b));
  bucket.summary.totalFiles = bucket.files.length;
  bucket.summary.hasDocs = bucket.files.some((file) => file.startsWith('docs/'));
  bucket.summary.hasTests = bucket.files.some((file) => file.includes('/test') || file.includes('.test.') || file.includes('__tests__'));
  bucket.summary.hasSupabase = bucket.files.some((file) => file.startsWith('supabase/'));
  bucket.summary.hasAppOrSrc = bucket.files.some((file) => file.startsWith('app/') || file.startsWith('src/'));

  writeJson(cwd, INDEX_PATH, bucket);
  return { indexPath: path.join(cwd, INDEX_PATH), index: bucket };
}

function inferType(filePath) {
  if (filePath.startsWith('app/') || filePath.startsWith('src/')) return 'app';
  if (filePath.startsWith('components/')) return 'component';
  if (filePath.startsWith('lib/')) return 'library';
  if (filePath.startsWith('supabase/')) return 'supabase';
  if (filePath.startsWith('docs/')) return 'docs';
  if (filePath.startsWith('scripts/')) return 'script';
  return 'file';
}

export function buildRepoGraph({ cwd = process.cwd(), index } = {}) {
  ensurePlaybookDir(cwd);
  const sourceIndex = index || (fs.existsSync(path.join(cwd, INDEX_PATH))
    ? JSON.parse(fs.readFileSync(path.join(cwd, INDEX_PATH), 'utf8'))
    : buildRepoIndex({ cwd }).index);

  const nodes = sourceIndex.files.map((file) => ({ id: file, type: inferType(file) }));
  const edges = [];
  const hasNode = new Set(sourceIndex.files);

  for (const file of sourceIndex.files) {
    const top = file.split('/')[0];
    if (top === 'app' || top === 'src') {
      if (hasNode.has('components')) {
        edges.push({ from: file, to: 'components', relation: 'may-use' });
      }
      if (hasNode.has('lib')) {
        edges.push({ from: file, to: 'lib', relation: 'may-use' });
      }
    }
  }

  const graph = {
    version: 1,
    generatedBy: 'playbook-graph',
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sparse: edges.length === 0,
    },
    nodes,
    edges,
  };

  writeJson(cwd, GRAPH_PATH, graph);
  return { graphPath: path.join(cwd, GRAPH_PATH), graph };
}

export function verifyExternalRepo({ cwd = process.cwd(), index, graph } = {}) {
  ensurePlaybookDir(cwd);
  const effectiveIndex = index || (fs.existsSync(path.join(cwd, INDEX_PATH))
    ? JSON.parse(fs.readFileSync(path.join(cwd, INDEX_PATH), 'utf8'))
    : buildRepoIndex({ cwd }).index);
  const effectiveGraph = graph || (fs.existsSync(path.join(cwd, GRAPH_PATH))
    ? JSON.parse(fs.readFileSync(path.join(cwd, GRAPH_PATH), 'utf8'))
    : buildRepoGraph({ cwd, index: effectiveIndex }).graph);

  const findings = [];
  if (!effectiveIndex.summary.hasDocs) {
    findings.push({ level: 'warning', code: 'MISSING_DOCS', message: 'No docs/ directory detected. External mode continues.' });
  }
  if (!effectiveIndex.summary.hasTests) {
    findings.push({ level: 'warning', code: 'MISSING_TESTS', message: 'No test files detected. External mode continues.' });
  }
  if (effectiveGraph.summary.sparse) {
    findings.push({ level: 'info', code: 'SPARSE_GRAPH', message: 'Repository graph is sparse; relationship inference limited.' });
  }

  const result = {
    version: 1,
    mode: 'external',
    ok: true,
    findingCount: findings.length,
    findings,
  };

  writeJson(cwd, path.join(PLAYBOOK_DIR, 'verify-findings.json'), result);
  return result;
}

export function buildPlan({ cwd = process.cwd() } = {}) {
  ensurePlaybookDir(cwd);
  const plan = {
    version: 1,
    mode: 'external',
    steps: [
      { id: 'init', description: 'Ensure .playbook runtime exists.' },
      { id: 'index', description: 'Generate repository index.' },
      { id: 'verify', description: 'Run external-safe verify checks.' },
    ],
  };
  return plan;
}
