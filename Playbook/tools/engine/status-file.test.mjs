import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildStatusPayload, validateStatusPayload, writeStatusFile } from './status-file.mjs';
import { runEngine } from './index.mjs';

function makeReport() {
  return {
    counts: { Draft: 2, Proposed: 1, Promoted: 0 },
    contracts: {
      status: 'WARN',
      checks: [
        { contract: 'SERVER_CLIENT_BOUNDARY', status: 'PASS' },
        { contract: 'SAFE_AREA_OWNERSHIP', status: 'WARN' }
      ]
    },
    suggestedCommand: 'npm run playbook:promote'
  };
}

test('buildStatusPayload creates valid payload', () => {
  const payload = buildStatusPayload({
    report: makeReport(),
    cwd: '/repo',
    engineVersion: '1.2.3',
    engineCommit: 'abcdef123456'
  });

  const validation = validateStatusPayload(payload);
  assert.equal(validation.valid, true);
  assert.equal(payload.contracts.summary.pass, 1);
  assert.equal(payload.contracts.summary.warn, 1);
  assert.equal(payload.recommendation.suggestedWhen, 'before_pr');
  assert.equal(payload.engine.statusSchemaVersion, payload.version);
});

test('writeStatusFile writes deterministic top-level key ordering', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-status-'));
  const statusPath = path.join(tempDir, 'docs/playbook-status.json');
  const payload = buildStatusPayload({
    report: makeReport(),
    cwd: tempDir,
    engineVersion: '1.2.3',
    engineCommit: 'abcdef123456'
  });

  writeStatusFile({ statusPath, payload });
  const text = fs.readFileSync(statusPath, 'utf8');
  assert.match(text, /\"contracts\"/);
  assert.match(text, /\"recommendation\"/);
  const secondPath = path.join(tempDir, 'docs/playbook-2.json');
  writeStatusFile({ statusPath: secondPath, payload: { ...payload, generatedAt: payload.generatedAt } });
  const text2 = fs.readFileSync(secondPath, 'utf8');
  assert.equal(text, text2);
});


test('schema file defines expected required top-level fields', () => {
  const schemaPath = path.resolve(process.cwd(), 'tools/schemas/playbook-status.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert.deepEqual(
    schema.required,
    ['version', 'generatedAt', 'engine', 'repo', 'knowledge', 'contracts', 'recommendation']
  );
});

test('runEngine writes docs/playbook-status.json on each run', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-engine-'));
  fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ version: '9.9.9' }));
  fs.writeFileSync(
    path.join(tempDir, 'docs/PLAYBOOK_NOTES.md'),
    '# Playbook Notes\n\n## Item\n- Type: Pattern\n- Summary: Test\n- Rationale: Test\n- Evidence: test\n- Suggested Playbook File: docs/PATTERNS/test.md\n- Status: Draft\n'
  );

  const report = runEngine({ cwd: tempDir, mode: 'run' });
  const statusPath = path.join(tempDir, 'docs/playbook-status.json');
  assert.equal(report.statusPath, statusPath);
  assert.equal(fs.existsSync(statusPath), true);

  const payload = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  assert.equal(payload.knowledge.draft.count, 1);
  assert.equal(payload.engine.version, '9.9.9');
  assert.equal(payload.engine.statusSchemaVersion, payload.version);
  const validation = validateStatusPayload(payload);
  assert.equal(validation.valid, true);
});
