import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runContractsAudit } from '../contracts-audit/index.mjs';
import { buildStatusPayload, validateStatusPayload, writeStatusFile } from './status-file.mjs';
import { generateSmartSignal } from './signals.mjs';

const REQUIRED_FIELDS = [
  'Type',
  'Summary',
  'Rationale',
  'Evidence',
  'Suggested Playbook File',
  'Status'
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultConfigPath = path.join(__dirname, 'default-config.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadConfig(cwd = process.cwd()) {
  const config = readJson(defaultConfigPath);
  const configCandidates = [
    path.join(cwd, 'tools/playbook/config.json'),
    path.join(cwd, 'playbook.config.json')
  ];

  const localConfigPath = configCandidates.find((candidate) => fs.existsSync(candidate));
  if (localConfigPath) {
    const local = readJson(localConfigPath);
    return {
      ...config,
      ...local,
      thresholds: { ...config.thresholds, ...(local.thresholds || {}) },
      contracts: { ...config.contracts, ...(local.contracts || {}) }
    };
  }
  return config;
}

export function parsePlaybookNotes(markdown) {
  const entries = [];
  const sections = markdown.split(/^##\s+/m).slice(1);

  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    const body = lines.slice(1).join('\n');
    const fields = {};

    for (const line of body.split('\n')) {
      const match = line.match(/^-\s+([^:]+):\s*(.+)$/);
      if (match) {
        fields[match[1].trim()] = match[2].trim();
      }
    }

    const missing = REQUIRED_FIELDS.filter((field) => !fields[field]);
    entries.push({ heading, fields, missing });
  }

  return entries;
}

function toStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function getSuggestedCommand(counts, thresholds, contractsStatus) {
  if (contractsStatus === 'FAIL') {
    return 'npm run playbook:contracts';
  }
  if (counts.Draft >= thresholds.draftToProposed) {
    return 'npm run playbook:promote';
  }
  if (counts.Proposed >= thresholds.proposedToPromoted) {
    return 'npm run playbook:promote -- --stage=promoted';
  }
  if (counts.Promoted >= thresholds.promotedToContract) {
    return 'npm run playbook:contracts';
  }
  return 'npm run playbook:status';
}


function readPackageMeta(cwd) {
  const packagePath = path.join(cwd, 'package.json');
  let version = '0.0.0';
  if (fs.existsSync(packagePath)) {
    const packageJson = readJson(packagePath);
    if (packageJson.version) version = packageJson.version;
  }

  let commit = 'unknown';
  const headPath = path.join(cwd, '.git', 'HEAD');
  if (fs.existsSync(headPath)) {
    const headRef = fs.readFileSync(headPath, 'utf8').trim();
    if (headRef.startsWith('ref:')) {
      const refPath = path.join(cwd, '.git', headRef.replace('ref: ', ''));
      if (fs.existsSync(refPath)) {
        commit = fs.readFileSync(refPath, 'utf8').trim().slice(0, 12);
      }
    } else if (headRef) {
      commit = headRef.slice(0, 12);
    }
  }

  return { version, commit };
}

function getStatusPath(cwd) {
  return path.resolve(cwd, 'docs/playbook-status.json');
}

function gitOutput(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function collectSignalInputs(cwd) {
  const changedFiles = gitOutput(cwd, ['diff', '--name-only', '--relative'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    changedFiles,
    commitMessage: gitOutput(cwd, ['log', '-1', '--pretty=%s']),
    branchName: gitOutput(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
  };
}


function autoFillDraftFields(entry, smartSignal) {
  const status = toStatus(entry.fields.Status);
  if (status !== 'draft' || !smartSignal) return entry;

  const next = { ...entry.fields };
  if (!next.Type) next.Type = smartSignal.type;
  if (!next['Suggested Playbook File'] && smartSignal.suggestedPlaybookFile) {
    next['Suggested Playbook File'] = smartSignal.suggestedPlaybookFile;
  }
  if (!next.Evidence && smartSignal.evidence.length > 0) {
    next.Evidence = smartSignal.evidence.join(', ');
  }
  if (!next.Tags && smartSignal.failureModeTags.length > 0) {
    next.Tags = smartSignal.failureModeTags.join(', ');
  }
  return { ...entry, fields: next, missing: REQUIRED_FIELDS.filter((field) => !next[field]) };
}

function ensureTrendFile(trendPath) {
  const dir = path.dirname(trendPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(trendPath)) {
    fs.writeFileSync(trendPath, JSON.stringify({ history: [] }, null, 2));
  }
}

export function runEngine({ cwd = process.cwd(), mode = 'run' } = {}) {
  const config = loadConfig(cwd);
  const notesPath = path.resolve(cwd, config.notesPath);
  const trendPath = path.resolve(cwd, config.trendPath);

  if (!fs.existsSync(notesPath)) {
    throw new Error(`PLAYBOOK_NOTES not found at ${notesPath}`);
  }

  const notes = fs.readFileSync(notesPath, 'utf8');
  const parsedEntries = parsePlaybookNotes(notes);
  const counts = {
    Observation: 0,
    Draft: 0,
    Proposed: 0,
    Promoted: 0,
    Contract: 0,
    Other: 0
  };

  const signalInput = collectSignalInputs(cwd);
  const smartSignal = generateSmartSignal({ cwd, ...signalInput });
  const entries = parsedEntries.map((entry) => autoFillDraftFields(entry, smartSignal));

  let missingFieldCount = 0;
  for (const entry of entries) {
    missingFieldCount += entry.missing.length;
    const status = toStatus(entry.fields.Status);
    if (status === 'observation') counts.Observation += 1;
    else if (status === 'draft') counts.Draft += 1;
    else if (status === 'proposed') counts.Proposed += 1;
    else if (status === 'promoted') counts.Promoted += 1;
    else if (status === 'contract') counts.Contract += 1;
    else counts.Other += 1;
  }

  const contractsReport = config.contracts.enabled
    ? runContractsAudit({ cwd, config })
    : { status: 'WARN', checks: [{ contract: 'CONTRACTS_DISABLED', status: 'WARN', message: 'Contracts audit disabled by config.' }] };

  const suggestedCommand = getSuggestedCommand(counts, config.thresholds, contractsReport.status);

  ensureTrendFile(trendPath);
  const trendData = readJson(trendPath);
  trendData.history.push({
    timestamp: new Date().toISOString(),
    mode,
    counts,
    missingFieldCount,
    contractsStatus: contractsReport.status,
    suggestedCommand
  });
  trendData.latest = trendData.history[trendData.history.length - 1];
  fs.writeFileSync(trendPath, JSON.stringify(trendData, null, 2));

  const statusPath = getStatusPath(cwd);
  const engineMeta = readPackageMeta(cwd);
  const signalSummary = {
    autoClassifiedDrafts: smartSignal.type ? 1 : 0,
    duplicatesSkipped: smartSignal.dedupe.isDuplicate ? 1 : 0,
    boundaryFlags: smartSignal.boundaryFlags
  };
  const statusPayload = buildStatusPayload({
    report: {
      counts,
      contracts: contractsReport,
      suggestedCommand,
      smartSignal,
      signalSummary
    },
    cwd,
    engineVersion: engineMeta.version,
    engineCommit: engineMeta.commit
  });
  const validation = validateStatusPayload(statusPayload);
  if (!validation.valid) {
    throw new Error(`Invalid playbook status payload: ${validation.errors.join('; ')}`);
  }
  writeStatusFile({ statusPath, payload: statusPayload });

  return {
    mode,
    counts,
    missingFieldCount,
    requiredFields: REQUIRED_FIELDS,
    contracts: contractsReport,
    suggestedCommand,
    notesPath,
    trendPath,
    statusPath,
    policy: config.thresholds.missingFieldPolicy,
    smartSignal
  };
}
