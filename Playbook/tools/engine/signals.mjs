import fs from 'node:fs';
import path from 'node:path';

const MEANINGFUL_PATH_PREFIXES = ['src/', 'app/', 'components/', 'lib/', 'supabase/', 'docs/', 'tools/'];

const SIGNAL_RULES = [
  {
    id: 'safe-area-contract',
    match: [/safe-?area/i, /app\/?shell/i, /bottom[-_ ]?(bar|actions?)/i],
    type: 'Architecture Contract',
    suggestedPlaybookFile: 'docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md',
    failureModeTags: ['safe-area', 'overlap'],
    boundaryFlags: ['ui-shell']
  },
  {
    id: 'single-scroll-contract',
    match: [/scroll/i, /app\/?shell/i],
    type: 'Architecture Contract',
    suggestedPlaybookFile: 'docs/CONTRACTS/SINGLE_SCROLL_OWNER.md',
    failureModeTags: ['scroll', 'overlap'],
    boundaryFlags: ['ui-shell']
  },
  {
    id: 'server-client-boundary',
    match: [/server/i, /client/i, /(middleware|rls|auth|token)/i],
    type: 'Guardrail',
    suggestedPlaybookFile: 'docs/CONTRACTS/SERVER_CLIENT_BOUNDARY.md',
    failureModeTags: ['race', 'auth'],
    boundaryFlags: ['server-client']
  },
  {
    id: 'supabase-pattern',
    match: [/supabase\//i, /(migration|rls|policy|sql)/i],
    type: 'Pattern',
    suggestedPlaybookFile: 'docs/PATTERNS/supabase-auth-rls.md',
    failureModeTags: ['db', 'policy'],
    boundaryFlags: ['db']
  },
  {
    id: 'ui-pattern',
    match: [/(src|app|components)\//i, /(layout|navigation|mobile|interaction)/i],
    type: 'Pattern',
    suggestedPlaybookFile: 'docs/PATTERNS/mobile-interactions-and-navigation.md',
    failureModeTags: ['scroll', 'tap-target'],
    boundaryFlags: ['ui-shell']
  }
];

const FAILURE_MODE_KEYWORDS = {
  scroll: /scroll|overflow|sticky/i,
  'safe-area': /safe-?area|inset/i,
  overlap: /overlap|overlay|fixed|absolute/i,
  race: /race|concurrent|timing|async/i,
  auth: /auth|token|session|refresh/i,
  db: /migration|sql|rls|policy|supabase/i
};

const BOUNDARY_RULES = [
  { flag: 'server-client', test: (paths) => hasPrefix(paths, 'src/server/') && hasAnyPrefix(paths, ['src/client/', 'app/', 'components/']) },
  { flag: 'ui-shell', test: (paths) => hasAnyPrefix(paths, ['app/', 'src/', 'components/']) },
  { flag: 'db', test: (paths) => hasAnyPrefix(paths, ['supabase/', 'db/', 'migrations/']) }
];

function hasPrefix(paths, prefix) {
  return paths.some((item) => item.startsWith(prefix));
}

function hasAnyPrefix(paths, prefixes) {
  return prefixes.some((prefix) => hasPrefix(paths, prefix));
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeHeading(value) {
  return normalizeText(value).replace(/\b(playbook|note|draft|proposed|promoted)\b/g, '').replace(/\s+/g, ' ').trim();
}

function collectHeadingsFromMarkdown(markdown) {
  const lines = markdown.split('\n');
  const headings = [];
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}

function loadDoctrineCorpus(cwd) {
  const files = [
    'docs/PRINCIPLES/_index.md',
    'docs/GUARDRAILS/guardrails.md',
    'docs/PATTERNS/mobile-interactions-and-navigation.md',
    'docs/PATTERNS/supabase-auth-rls.md',
    'docs/CONTRACTS/_index.md',
    'docs/PLAYBOOK_NOTES.md'
  ];

  const headings = [];
  for (const relPath of files) {
    const absolute = path.join(cwd, relPath);
    if (!fs.existsSync(absolute)) continue;
    const markdown = fs.readFileSync(absolute, 'utf8');
    for (const heading of collectHeadingsFromMarkdown(markdown)) {
      headings.push({
        heading,
        path: relPath,
        normalized: normalizeHeading(heading)
      });
    }
  }
  return headings;
}

function meaningfulEvidence(changedFiles) {
  return changedFiles.filter((file) => MEANINGFUL_PATH_PREFIXES.some((prefix) => file.startsWith(prefix)));
}

function buildRuleContext(changedFiles, commitMessage, branchName, diffText) {
  return `${changedFiles.join(' ')} ${commitMessage || ''} ${branchName || ''} ${diffText || ''}`.trim();
}

function collectRuleHits(context) {
  return SIGNAL_RULES
    .map((rule) => {
      const score = rule.match.reduce((acc, regex) => (regex.test(context) ? acc + 1 : acc), 0);
      return { rule, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score);
}

function pickType(ruleHits) {
  if (ruleHits.length === 0) return 'Principle';
  const priority = {
    'Architecture Contract': 5,
    Guardrail: 4,
    'Failure Mode': 3,
    Pattern: 2,
    Principle: 1
  };
  const sorted = [...ruleHits].sort((a, b) => {
    const delta = priority[b.rule.type] - priority[a.rule.type];
    if (delta !== 0) return delta;
    return b.score - a.score;
  });
  return sorted[0].rule.type;
}

function pickSuggestedFile(ruleHits) {
  if (ruleHits.length === 0) return null;
  const preferred = ruleHits.find((hit) => hit.rule.type === 'Architecture Contract' || hit.rule.type === 'Guardrail');
  return (preferred || ruleHits[0]).rule.suggestedPlaybookFile;
}

function collectFailureModeTags(context, ruleHits) {
  const tags = new Set();
  for (const [tag, regex] of Object.entries(FAILURE_MODE_KEYWORDS)) {
    if (regex.test(context)) tags.add(tag);
  }
  for (const hit of ruleHits) {
    for (const tag of hit.rule.failureModeTags || []) tags.add(tag);
  }
  return [...tags].sort();
}

function collectBoundaryFlags(paths, ruleHits) {
  const flags = new Set();
  for (const boundary of BOUNDARY_RULES) {
    if (boundary.test(paths)) flags.add(boundary.flag);
  }
  for (const hit of ruleHits) {
    for (const flag of hit.rule.boundaryFlags || []) flags.add(flag);
  }
  return [...flags].sort();
}

function computeConfidence({ ruleHits, evidence, failureModeTags, boundaryFlags }) {
  let score = 0.2;
  if (ruleHits.length > 0) {
    const maxRuleStrength = Math.min(ruleHits[0].score / 3, 1);
    score += 0.35 * maxRuleStrength;
    score += 0.15 * Math.min(ruleHits.length / 3, 1);
  }
  score += 0.15 * Math.min(evidence.length / 4, 1);
  score += 0.1 * Math.min(failureModeTags.length / 4, 1);
  score += 0.05 * Math.min(boundaryFlags.length / 3, 1);
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function candidateTitle(type, ruleHits, failureModeTags, boundaryFlags) {
  const source = ruleHits[0]?.rule?.id?.replace(/-/g, ' ') || failureModeTags[0] || boundaryFlags[0] || 'governance signal';
  return `${type}: ${source}`;
}

function detectDuplicate(cwd, candidate) {
  const corpus = loadDoctrineCorpus(cwd);
  const normalizedCandidate = normalizeHeading(candidate);
  const exact = corpus.find((item) => item.normalized && item.normalized === normalizedCandidate);
  if (exact) {
    return {
      isDuplicate: true,
      matchedTitle: exact.heading,
      matchedPath: exact.path,
      reason: 'Exact normalized heading match in doctrine corpus.'
    };
  }

  const tokens = new Set(normalizedCandidate.split(' ').filter(Boolean));
  const fuzzy = corpus.find((item) => {
    if (!item.normalized) return false;
    const headingTokens = item.normalized.split(' ').filter(Boolean);
    const overlap = headingTokens.filter((token) => tokens.has(token)).length;
    const threshold = Math.max(2, Math.floor(Math.min(tokens.size, headingTokens.length) * 0.6));
    return overlap >= threshold;
  });

  if (fuzzy) {
    return {
      isDuplicate: true,
      matchedTitle: fuzzy.heading,
      matchedPath: fuzzy.path,
      reason: 'High token overlap with existing doctrine heading; prefer linking over creating duplicate note.'
    };
  }

  return {
    isDuplicate: false,
    matchedTitle: null,
    matchedPath: null,
    reason: 'No matching heading fingerprint found in doctrine corpus.'
  };
}

export function generateSmartSignal({ cwd = process.cwd(), changedFiles = [], commitMessage = '', branchName = '', diffText = '' } = {}) {
  const files = [...new Set(changedFiles.map((item) => String(item).replace(/\\/g, '/')).filter(Boolean))].sort();
  const evidence = meaningfulEvidence(files);
  const context = buildRuleContext(files, commitMessage, branchName, diffText);
  const ruleHits = collectRuleHits(context);
  const type = pickType(ruleHits);
  const suggestedPlaybookFile = pickSuggestedFile(ruleHits);
  const failureModeTags = collectFailureModeTags(context, ruleHits);
  const boundaryFlags = collectBoundaryFlags(files, ruleHits);
  const confidence = computeConfidence({ ruleHits, evidence, failureModeTags, boundaryFlags });
  const inferredTitle = candidateTitle(type, ruleHits, failureModeTags, boundaryFlags);
  const dedupe = detectDuplicate(cwd, inferredTitle);

  return {
    type,
    suggestedPlaybookFile,
    evidence,
    failureModeTags,
    boundaryFlags,
    confidence,
    dedupe
  };
}

export function getSignalRules() {
  return SIGNAL_RULES.map((rule) => ({
    id: rule.id,
    type: rule.type,
    suggestedPlaybookFile: rule.suggestedPlaybookFile,
    failureModeTags: rule.failureModeTags,
    boundaryFlags: rule.boundaryFlags
  }));
}
