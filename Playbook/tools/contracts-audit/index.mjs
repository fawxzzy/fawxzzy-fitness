import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONTRACT_FILES = [
  'docs/CONTRACTS/SERVER_CLIENT_BOUNDARY.md',
  'docs/CONTRACTS/SINGLE_SCROLL_OWNER.md',
  'docs/CONTRACTS/BOTTOM_ACTIONS_OWNERSHIP.md',
  'docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md'
];

function scanFiles(dir, matcher, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      scanFiles(fullPath, matcher, results);
    } else if (matcher(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const segment = glob.slice(i);
    if (segment.startsWith('**/')) {
      source += '(?:.*/)?';
      i += 2;
      continue;
    }
    if (segment.startsWith('**')) {
      source += '.*';
      i += 1;
      continue;
    }
    if (glob[i] === '*') {
      source += '[^/]*';
      continue;
    }
    source += escapeRegex(glob[i]);
  }
  return new RegExp(`^${source}$`);
}

function parseArrayField(line, field) {
  const match = line.match(new RegExp(`^-\\s+${field}:\\s*(.+)$`));
  if (!match) return null;
  const parsed = JSON.parse(match[1]);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error(`${field} must be a JSON string array`);
  }
  return parsed;
}

export function parseContractAuditRules(markdown) {
  const sectionMatch = markdown.match(/##\s+Audit Rules \(v1\)\s*\n([\s\S]*?)(?:\n##\s+|$)/);
  if (!sectionMatch) return null;

  const lines = sectionMatch[1].split('\n').map((line) => line.trim()).filter(Boolean);
  const fields = {
    targetGlobs: null,
    forbiddenRegex: null,
    requiredRegex: null,
    allowlistGlobs: null
  };

  for (const line of lines) {
    if (line.startsWith('- Target globs:')) fields.targetGlobs = parseArrayField(line, 'Target globs');
    else if (line.startsWith('- Forbidden regex:')) fields.forbiddenRegex = parseArrayField(line, 'Forbidden regex');
    else if (line.startsWith('- Required regex:')) fields.requiredRegex = parseArrayField(line, 'Required regex');
    else if (line.startsWith('- Allowlist globs:')) fields.allowlistGlobs = parseArrayField(line, 'Allowlist globs');
    else throw new Error(`Unsupported audit rule line: ${line}`);
  }

  if (!fields.targetGlobs || !fields.forbiddenRegex) {
    throw new Error('Audit Rules (v1) requires Target globs and Forbidden regex fields');
  }

  return {
    targetGlobs: fields.targetGlobs,
    forbiddenRegex: fields.forbiddenRegex,
    requiredRegex: fields.requiredRegex || [],
    allowlistGlobs: fields.allowlistGlobs || []
  };
}

function collectLine(content, index) {
  return content.slice(0, index).split('\n').length;
}

function runDocRulesCheck({ cwd, contractId, rules, globalAllowlistGlobs = [] }) {
  const targetMatchers = rules.targetGlobs.map(globToRegex);
  const allowMatchers = [...rules.allowlistGlobs, ...globalAllowlistGlobs].map(globToRegex);
  const candidates = scanFiles(cwd, (file) => {
    const rel = path.relative(cwd, file).replaceAll('\\\\', '/');
    if (rel.startsWith('docs/')) return false;
    if (allowMatchers.some((matcher) => matcher.test(rel))) return false;
    return targetMatchers.some((matcher) => matcher.test(rel));
  });

  const violations = [];
  for (const file of candidates) {
    const rel = path.relative(cwd, file).replaceAll('\\\\', '/');
    const content = fs.readFileSync(file, 'utf8');

    for (const pattern of rules.forbiddenRegex) {
      const regex = new RegExp(pattern, 'gm');
      let match = regex.exec(content);
      while (match) {
        violations.push({ file: rel, line: collectLine(content, match.index), type: 'forbidden', pattern });
        if (match.index === regex.lastIndex) regex.lastIndex += 1;
        match = regex.exec(content);
      }
    }

    for (const pattern of rules.requiredRegex) {
      const regex = new RegExp(pattern, 'm');
      if (!regex.test(content)) {
        violations.push({ file: rel, line: 1, type: 'required', pattern });
      }
    }
  }

  const status = violations.length ? 'FAIL' : 'PASS';
  const preview = violations.slice(0, 5).map((item) => `${item.file}:${item.line}`).join(', ');

  return {
    contract: contractId,
    status,
    message: status === 'PASS'
      ? `Audit Rules (v1) passed for ${contractId}.`
      : `Audit Rules (v1) found ${violations.length} violation(s): ${preview}`,
    violations
  };
}

function checkContractFiles(cwd, contractFiles) {
  const checks = [];
  for (const file of contractFiles) {
    const exists = fs.existsSync(path.join(cwd, file));
    checks.push({
      contract: path.basename(file, '.md'),
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? `Contract document present: ${file}` : `Missing contract document: ${file}`
    });
  }
  return checks;
}

function checkServerClientBoundary(cwd) {
  const tsxFiles = scanFiles(cwd, (file) => /\.(tsx|jsx|ts|js)$/.test(file));
  const offenders = [];
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes("'use client'") && /(next\/headers|server-only|revalidatePath|revalidateTag)/.test(content)) {
      offenders.push(path.relative(cwd, file));
    }
  }
  return {
    contract: 'SERVER_CLIENT_BOUNDARY',
    status: offenders.length ? 'FAIL' : 'PASS',
    message: offenders.length
      ? `Client modules importing server-only concerns: ${offenders.join(', ')}`
      : 'No obvious client/server boundary violations detected.'
  };
}

function checkSafeAreaOwnership(cwd) {
  const files = scanFiles(cwd, (file) => /\.(tsx|jsx|css)$/.test(file));
  const hits = [];
  for (const file of files) {
    const rel = path.relative(cwd, file);
    if (rel.includes('AppShell')) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/safe-area-inset-(top|bottom)/.test(content)) hits.push(rel);
  }
  return {
    contract: 'SAFE_AREA_OWNERSHIP',
    status: hits.length ? 'WARN' : 'PASS',
    message: hits.length
      ? `Safe-area tokens found outside AppShell ownership: ${hits.join(', ')}`
      : 'Safe-area ownership appears centralized.'
  };
}

function checkScrollAndBottomOwnership(cwd) {
  const files = scanFiles(cwd, (file) => /\.(tsx|jsx|css)$/.test(file));
  let multiScrollSignals = 0;
  let bottomBarSignals = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if ((content.match(/overflow-y-auto/g) || []).length > 1) multiScrollSignals += 1;
    if (/bottom-0/.test(content) && /fixed/.test(content)) bottomBarSignals += 1;
  }

  return [
    {
      contract: 'SINGLE_SCROLL_OWNER',
      status: multiScrollSignals > 3 ? 'WARN' : 'PASS',
      message:
        multiScrollSignals > 3
          ? `Detected ${multiScrollSignals} files with multiple scroll-owner markers; verify single-scroll contract.`
          : 'No strong multi-scroll owner signal detected.'
    },
    {
      contract: 'BOTTOM_ACTIONS_OWNERSHIP',
      status: bottomBarSignals > 0 ? 'WARN' : 'PASS',
      message:
        bottomBarSignals > 0
          ? `Detected ${bottomBarSignals} fixed bottom bar marker(s); verify shared owner contract.`
          : 'No fixed-bottom markers found.'
    }
  ];
}

function parseContractRuleMap(cwd, contractFiles) {
  const map = new Map();
  for (const file of contractFiles) {
    const abs = path.join(cwd, file);
    if (!fs.existsSync(abs)) continue;
    const markdown = fs.readFileSync(abs, 'utf8');
    const contractId = path.basename(file, '.md');
    const rules = parseContractAuditRules(markdown);
    if (rules) map.set(contractId, rules);
  }
  return map;
}

export function runContractsAudit({ cwd = process.cwd(), contractFiles = DEFAULT_CONTRACT_FILES, config = {} } = {}) {
  const globalAllowlistGlobs = config.contracts?.allowlistGlobs || [];
  const contractExceptions = config.contracts?.exceptions || {};

  const checks = [
    ...checkContractFiles(cwd, contractFiles)
  ];

  const ruleMap = parseContractRuleMap(cwd, contractFiles);

  const handwrittenChecks = [
    checkServerClientBoundary(cwd),
    checkSafeAreaOwnership(cwd),
    ...checkScrollAndBottomOwnership(cwd)
  ];

  for (const check of handwrittenChecks) {
    if (ruleMap.has(check.contract)) {
      checks.push(runDocRulesCheck({ cwd, contractId: check.contract, rules: ruleMap.get(check.contract), globalAllowlistGlobs }));
    } else {
      checks.push(check);
    }
  }

  const normalizedChecks = checks.map((check) => {
    const exception = contractExceptions[check.contract];
    if (!exception) return check;
    if (exception === 'ignore') {
      return { ...check, status: 'PASS', message: `${check.message} (exception: ignore)` };
    }
    if (exception === 'warn') {
      return { ...check, status: 'WARN', message: `${check.message} (exception: warn)` };
    }
    return check;
  });

  const grouped = new Map();
  for (const check of normalizedChecks) {
    const id = check.contract;
    const status = String(check.status || 'FAIL').toLowerCase();
    const normalized = status === 'pass' || status === 'warn' ? status : 'fail';
    const violations = Array.isArray(check.violations)
      ? check.violations.length
      : String(check.status || '').toUpperCase() === 'PASS'
        ? 0
        : 1;

    if (!grouped.has(id)) grouped.set(id, { id, status: normalized, violations: 0 });
    const current = grouped.get(id);
    if (normalized === 'fail' || (normalized === 'warn' && current.status === 'pass')) {
      current.status = normalized;
    }
    current.violations += violations;
  }

  const byContract = Array.from(grouped.values()).sort((a, b) => a.id.localeCompare(b.id));
  const summary = { pass: 0, warn: 0, fail: 0 };
  for (const contract of byContract) {
    summary[contract.status] += 1;
  }

  let status = 'PASS';
  if (summary.fail > 0) status = 'FAIL';
  else if (summary.warn > 0) status = 'WARN';

  return { status, summary, byContract, checks: normalizedChecks };
}
