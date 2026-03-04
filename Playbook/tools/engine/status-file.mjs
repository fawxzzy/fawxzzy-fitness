import fs from 'node:fs';
import path from 'node:path';

const STATUS_SCHEMA_VERSION = '1.0';

function stableSort(value) {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = stableSort(value[key]);
    }
    return sorted;
  }
  return value;
}

function writeFileAtomic(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, targetPath);
}

function toContractStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PASS') return 'pass';
  if (normalized === 'WARN') return 'warn';
  return 'fail';
}

function getRecommendationMeta(command, contractsStatus) {
  if (contractsStatus === 'FAIL') {
    return {
      reason: 'Contract checks are failing; resolve violations before additional promotion work.',
      suggestedWhen: 'now'
    };
  }
  if (command.includes('playbook:promote')) {
    return {
      reason: 'Knowledge lifecycle thresholds indicate promotion readiness.',
      suggestedWhen: 'before_pr'
    };
  }
  if (command.includes('playbook:contracts')) {
    return {
      reason: 'Run contracts audit before shipping governance-sensitive changes.',
      suggestedWhen: 'before_merge'
    };
  }
  return {
    reason: 'No promotions required right now; refresh status after the next note update.',
    suggestedWhen: 'before_pr'
  };
}

export function buildStatusPayload({ report, cwd, engineVersion, engineCommit }) {
  const grouped = new Map();
  for (const check of report.contracts.checks) {
    const normalized = toContractStatus(check.status);
    if (!grouped.has(check.contract)) {
      grouped.set(check.contract, { id: check.contract, status: normalized, violations: 0 });
    }

    const current = grouped.get(check.contract);
    if (normalized === 'fail' || (normalized === 'warn' && current.status === 'pass')) {
      current.status = normalized;
    }

    const violationCount = Array.isArray(check.violations)
      ? check.violations.length
      : normalized === 'pass'
        ? 0
        : 1;
    current.violations += violationCount;
  }

  const byContract = Array.from(grouped.values()).sort((a, b) => a.id.localeCompare(b.id));
  const summary = { pass: 0, warn: 0, fail: 0 };
  for (const contract of byContract) {
    summary[contract.status] += 1;
  }

  const recommendationMeta = getRecommendationMeta(report.suggestedCommand, report.contracts.status);

  return {
    version: STATUS_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    engine: {
      name: 'playbook-engine',
      version: engineVersion,
      commit: engineCommit,
      statusSchemaVersion: STATUS_SCHEMA_VERSION
    },
    repo: {
      root: cwd,
      name: path.basename(cwd)
    },
    knowledge: {
      draft: { count: report.counts.Draft },
      proposed: { count: report.counts.Proposed },
      promoted: { count: report.counts.Promoted }
    },
    contracts: {
      summary,
      byContract
    },
    recommendation: {
      nextCommand: report.suggestedCommand,
      reason: recommendationMeta.reason,
      suggestedWhen: recommendationMeta.suggestedWhen
    }
  };
}

export function writeStatusFile({ statusPath, payload }) {
  const content = `${JSON.stringify(stableSort(payload), null, 2)}\n`;
  writeFileAtomic(statusPath, content);
}

export function validateStatusPayload(payload) {
  const errors = [];
  const requiredTop = ['version', 'generatedAt', 'engine', 'repo', 'knowledge', 'contracts', 'recommendation'];
  for (const key of requiredTop) {
    if (!(key in payload)) errors.push(`Missing required field: ${key}`);
  }
  if (!/^\d+\.\d+$/.test(String(payload.version || ''))) errors.push('version must match major.minor format');
  if (Number.isNaN(Date.parse(payload.generatedAt || ''))) errors.push('generatedAt must be an ISO timestamp');

  if (!payload.engine || typeof payload.engine !== 'object') errors.push('engine must be an object');
  else {
    for (const key of ['name', 'version', 'commit']) {
      if (!payload.engine[key] || typeof payload.engine[key] !== 'string') {
        errors.push(`engine.${key} must be a string`);
      }
    }
    if (payload.engine.statusSchemaVersion !== payload.version) {
      errors.push('engine.statusSchemaVersion must equal version');
    }
  }

  const know = payload.knowledge || {};
  for (const key of ['draft', 'proposed', 'promoted']) {
    if (!know[key] || !Number.isInteger(know[key].count) || know[key].count < 0) {
      errors.push(`knowledge.${key}.count must be a non-negative integer`);
    }
  }

  const contracts = payload.contracts || {};
  for (const key of ['pass', 'warn', 'fail']) {
    if (!contracts.summary || !Number.isInteger(contracts.summary[key]) || contracts.summary[key] < 0) {
      errors.push(`contracts.summary.${key} must be a non-negative integer`);
    }
  }

  if (!Array.isArray(contracts.byContract)) {
    errors.push('contracts.byContract must be an array');
  } else {
    for (const contract of contracts.byContract) {
      if (!contract.id || typeof contract.id !== 'string') errors.push('contracts.byContract[].id must be a string');
      if (!['pass', 'warn', 'fail'].includes(contract.status)) errors.push('contracts.byContract[].status must be pass|warn|fail');
      if (!Number.isInteger(contract.violations) || contract.violations < 0) {
        errors.push('contracts.byContract[].violations must be a non-negative integer');
      }
    }
  }

  const rec = payload.recommendation || {};
  if (!rec.nextCommand || typeof rec.nextCommand !== 'string') errors.push('recommendation.nextCommand must be a string');
  if (!rec.reason || typeof rec.reason !== 'string') errors.push('recommendation.reason must be a string');
  if (!['now', 'before_pr', 'before_merge'].includes(rec.suggestedWhen)) {
    errors.push('recommendation.suggestedWhen must be now|before_pr|before_merge');
  }

  return { valid: errors.length === 0, errors };
}
