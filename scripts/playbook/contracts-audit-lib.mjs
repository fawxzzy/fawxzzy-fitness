import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CONTRACTS = [
  'SERVER_CLIENT_BOUNDARY',
  'SAFE_AREA_OWNERSHIP',
  'BOTTOM_ACTIONS_OWNERSHIP',
  'SINGLE_SCROLL_OWNER',
];

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function toPosixRelative(rootDir, absolutePath) {
  return normalizePath(path.relative(rootDir, absolutePath));
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAnyGlob(value, globs = []) {
  return globs.some((glob) => globToRegExp(glob).test(value));
}

async function loadAllowlist(allowlistPath) {
  if (!allowlistPath) {
    return { ignoredPaths: [], contracts: {} };
  }

  try {
    const raw = await fs.readFile(allowlistPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ignoredPaths: Array.isArray(parsed.ignoredPaths) ? parsed.ignoredPaths : [],
      contracts: parsed.contracts && typeof parsed.contracts === 'object' ? parsed.contracts : {},
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ignoredPaths: [], contracts: {} };
    }
    throw error;
  }
}

async function walkFiles(rootDir) {
  const files = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next') continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }

  return files;
}

function findLineNumber(content, index) {
  if (index < 0) return null;
  return content.slice(0, index).split(/\r?\n/).length;
}

function collectLineMatches(content, regex) {
  const results = [];
  for (const match of content.matchAll(regex)) {
    const line = findLineNumber(content, match.index ?? -1);
    results.push({ match: match[0], line });
  }
  return results;
}

function buildViolation(contractId, file, line, reason, excerpt) {
  return { contractId, file, line: line ?? null, reason, excerpt: excerpt || null };
}

function isClientComponent(content) {
  return /^\s*['\"]use client['\"];?/m.test(content);
}

function evaluateContractStatus(contractId, violations) {
  if (contractId === 'SINGLE_SCROLL_OWNER') {
    return violations.length > 0 ? 'WARN' : 'PASS';
  }
  return violations.length > 0 ? 'FAIL' : 'PASS';
}

function computeSummary(byContract) {
  return byContract.reduce(
    (acc, contract) => {
      if (contract.status === 'FAIL') acc.fail += 1;
      if (contract.status === 'WARN') acc.warn += 1;
      if (contract.status === 'PASS') acc.pass += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 },
  );
}

function deriveOverallStatus(summary) {
  if (summary.fail > 0) return 'FAIL';
  if (summary.warn > 0) return 'WARN';
  return 'PASS';
}

export async function runContractsAudit({ rootDir = process.cwd(), allowlistPath } = {}) {
  const allowlist = await loadAllowlist(allowlistPath);
  const allFiles = await walkFiles(rootDir);
  const sourceFiles = allFiles
    .map((absolutePath) => ({ absolutePath, relativePath: toPosixRelative(rootDir, absolutePath) }))
    .filter(({ relativePath }) => relativePath.startsWith('src/'))
    .filter(({ relativePath }) => !matchesAnyGlob(relativePath, allowlist.ignoredPaths));

  const violationsByContract = new Map(DEFAULT_CONTRACTS.map((id) => [id, []]));

  for (const { absolutePath, relativePath } of sourceFiles) {
    const content = await fs.readFile(absolutePath, 'utf8');

    const contractAllow = (contractId) => allowlist.contracts?.[contractId] || {};
    const shouldIgnoreContractPath = (contractId) => {
      const rule = contractAllow(contractId);
      const allowGlobs = Array.isArray(rule.allowGlobs) ? rule.allowGlobs : [];
      return matchesAnyGlob(relativePath, allowGlobs);
    };

    if (!shouldIgnoreContractPath('SERVER_CLIENT_BOUNDARY') && isClientComponent(content)) {
      const clientViolations = [];
      const importServerPatterns = [
        /from\s+['\"]@\/lib\/supabase\/(server|server-anon|admin)['\"]/g,
        /from\s+['\"][^'\"]*supabase\/(server|server-anon|admin)['\"]/g,
      ];
      for (const pattern of importServerPatterns) {
        for (const match of collectLineMatches(content, pattern)) {
          clientViolations.push(
            buildViolation(
              'SERVER_CLIENT_BOUNDARY',
              relativePath,
              match.line,
              'Client file imports a server Supabase helper.',
              match.match,
            ),
          );
        }
      }

      for (const match of collectLineMatches(content, /from\s+['\"]@supabase\/[^'\"]+['\"]/g)) {
        clientViolations.push(
          buildViolation(
            'SERVER_CLIENT_BOUNDARY',
            relativePath,
            match.line,
            'Client file imports @supabase/* package directly.',
            match.match,
          ),
        );
      }

      for (const match of collectLineMatches(content, /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s+['\"][^'\"]+['\"]/g)) {
        clientViolations.push(
          buildViolation(
            'SERVER_CLIENT_BOUNDARY',
            relativePath,
            match.line,
            'Client file imports createClient.',
            match.match,
          ),
        );
      }

      for (const match of collectLineMatches(content, /\bsupabase\.from\s*\(/g)) {
        clientViolations.push(
          buildViolation(
            'SERVER_CLIENT_BOUNDARY',
            relativePath,
            match.line,
            'Client file performs direct supabase.from(...) access.',
            match.match,
          ),
        );
      }

      const ignoredRegexes = (contractAllow('SERVER_CLIENT_BOUNDARY').ignoredRegexes || []).map((value) => new RegExp(value));
      violationsByContract.set(
        'SERVER_CLIENT_BOUNDARY',
        violationsByContract
          .get('SERVER_CLIENT_BOUNDARY')
          .concat(clientViolations.filter((entry) => !ignoredRegexes.some((regex) => regex.test(entry.excerpt || '')))),
      );
    }

    if (!shouldIgnoreContractPath('SAFE_AREA_OWNERSHIP')) {
      const safeAreaViolations = [];
      const safePatterns = [/env\(safe-area-inset-(top|bottom)/g, /safe-area-inset/g];
      for (const pattern of safePatterns) {
        for (const match of collectLineMatches(content, pattern)) {
          safeAreaViolations.push(
            buildViolation('SAFE_AREA_OWNERSHIP', relativePath, match.line, 'Safe-area inset usage is owned by AppShell/shells.', match.match),
          );
        }
      }
      const ignoredRegexes = (contractAllow('SAFE_AREA_OWNERSHIP').ignoredRegexes || []).map((value) => new RegExp(value));
      violationsByContract.set(
        'SAFE_AREA_OWNERSHIP',
        violationsByContract
          .get('SAFE_AREA_OWNERSHIP')
          .concat(safeAreaViolations.filter((entry) => !ignoredRegexes.some((regex) => regex.test(entry.excerpt || '')))),
      );
    }

    if (!shouldIgnoreContractPath('BOTTOM_ACTIONS_OWNERSHIP')) {
      const bottomViolations = [];
      const allowedBottomActionBarGlobs = ['src/components/layout/bottom-actions.tsx', 'src/components/ui/BottomActionBar.tsx'];
      const allowedProviderSlotGlobs = ['src/components/layout/ScrollScreenWithBottomActions.tsx', 'src/components/layout/bottom-actions.tsx'];

      if (!matchesAnyGlob(relativePath, allowedBottomActionBarGlobs)) {
        for (const match of collectLineMatches(content, /<\s*BottomActionBar\b/g)) {
          bottomViolations.push(
            buildViolation(
              'BOTTOM_ACTIONS_OWNERSHIP',
              relativePath,
              match.line,
              'BottomActionBar should only be mounted by screen shell bottom-actions layer.',
              match.match,
            ),
          );
        }
      }

      if (!matchesAnyGlob(relativePath, allowedProviderSlotGlobs)) {
        for (const match of collectLineMatches(content, /<\s*BottomActionsProvider\b/g)) {
          bottomViolations.push(
            buildViolation(
              'BOTTOM_ACTIONS_OWNERSHIP',
              relativePath,
              match.line,
              'BottomActionsProvider mount outside screen shell.',
              match.match,
            ),
          );
        }
        for (const match of collectLineMatches(content, /<\s*BottomActionsSlot\b/g)) {
          bottomViolations.push(
            buildViolation(
              'BOTTOM_ACTIONS_OWNERSHIP',
              relativePath,
              match.line,
              'BottomActionsSlot mount outside screen shell.',
              match.match,
            ),
          );
        }
      }

      const ignoredRegexes = (contractAllow('BOTTOM_ACTIONS_OWNERSHIP').ignoredRegexes || []).map((value) => new RegExp(value));
      violationsByContract.set(
        'BOTTOM_ACTIONS_OWNERSHIP',
        violationsByContract
          .get('BOTTOM_ACTIONS_OWNERSHIP')
          .concat(bottomViolations.filter((entry) => !ignoredRegexes.some((regex) => regex.test(entry.excerpt || '')))),
      );
    }

    if (!shouldIgnoreContractPath('SINGLE_SCROLL_OWNER') && /src\/app\/.+\/page\.tsx$/.test(relativePath)) {
      const scrollWarnings = [];
      const overflowMatches = collectLineMatches(content, /overflow-(?:y-)?auto/g);
      if (overflowMatches.length > 1) {
        scrollWarnings.push(
          buildViolation(
            'SINGLE_SCROLL_OWNER',
            relativePath,
            overflowMatches[1].line,
            `Found ${overflowMatches.length} overflow-auto/overflow-y-auto markers in route page.`,
            overflowMatches[1].match,
          ),
        );
      }

      if ((content.match(/<\s*ScrollContainer\b/g) || []).length > 0 && overflowMatches.length > 0) {
        scrollWarnings.push(
          buildViolation(
            'SINGLE_SCROLL_OWNER',
            relativePath,
            overflowMatches[0]?.line ?? null,
            'ScrollContainer appears together with explicit overflow-* class; potential nested scroll owner.',
            overflowMatches[0]?.match || '<ScrollContainer>',
          ),
        );
      }

      violationsByContract.set('SINGLE_SCROLL_OWNER', violationsByContract.get('SINGLE_SCROLL_OWNER').concat(scrollWarnings));
    }
  }

  const byContract = DEFAULT_CONTRACTS.map((id) => {
    const items = violationsByContract.get(id) || [];
    return {
      id,
      status: evaluateContractStatus(id, items),
      violations: items.length,
      items,
    };
  });

  const summary = computeSummary(byContract);
  return {
    status: deriveOverallStatus(summary),
    summary,
    byContract,
  };
}
