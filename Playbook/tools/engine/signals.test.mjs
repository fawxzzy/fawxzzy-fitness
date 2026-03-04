import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { generateSmartSignal } from './signals.mjs';

function readFixture(name) {
  const fixturePath = path.resolve(process.cwd(), `tools/engine/fixtures/signals/${name}.json`);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('classifies safe-area shell updates as architecture contract', () => {
  const signal = generateSmartSignal({ cwd: process.cwd(), ...readFixture('safe-area') });

  assert.equal(signal.type, 'Architecture Contract');
  assert.equal(signal.suggestedPlaybookFile, 'docs/CONTRACTS/SAFE_AREA_OWNERSHIP.md');
  assert.deepEqual(signal.evidence, [
    'app/AppShell.tsx',
    'components/BottomActionBar.tsx',
    'src/layout/safe-area.ts'
  ]);
  assert.equal(signal.failureModeTags.includes('safe-area'), true);
  assert.equal(signal.boundaryFlags.includes('ui-shell'), true);
  assert.equal(signal.confidence >= 0.7, true);
});

test('detects db + server/client boundaries and keeps confidence bounded', () => {
  const signal = generateSmartSignal({ cwd: process.cwd(), ...readFixture('db-boundary') });

  assert.equal(signal.type, 'Guardrail');
  assert.equal(signal.suggestedPlaybookFile, 'docs/CONTRACTS/SERVER_CLIENT_BOUNDARY.md');
  assert.equal(signal.boundaryFlags.includes('db'), true);
  assert.equal(signal.boundaryFlags.includes('server-client'), true);
  assert.equal(signal.confidence <= 1, true);
  assert.equal(signal.confidence >= 0.6, true);
});

test('dedupe flags existing doctrine heading fingerprints', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-signals-'));
  fs.mkdirSync(path.join(tempDir, 'docs/PRINCIPLES'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'docs/GUARDRAILS'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'docs/PATTERNS'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'docs/CONTRACTS'), { recursive: true });

  fs.writeFileSync(path.join(tempDir, 'docs/PRINCIPLES/_index.md'), '# Principles\n## Overview\n');
  fs.writeFileSync(path.join(tempDir, 'docs/GUARDRAILS/guardrails.md'), '# Guardrails\n');
  fs.writeFileSync(path.join(tempDir, 'docs/PATTERNS/mobile-interactions-and-navigation.md'), '# Patterns\n');
  fs.writeFileSync(path.join(tempDir, 'docs/PATTERNS/supabase-auth-rls.md'), '# Supabase auth rls\n');
  fs.writeFileSync(path.join(tempDir, 'docs/CONTRACTS/_index.md'), '# Contracts\n## Architecture Contract: safe area contract\n');
  fs.writeFileSync(path.join(tempDir, 'docs/PLAYBOOK_NOTES.md'), '# Notes\n');

  const signal = generateSmartSignal({
    cwd: tempDir,
    changedFiles: ['app/safe-area-shell.tsx'],
    commitMessage: 'safe area contract',
    branchName: 'feature/safe-area'
  });

  assert.equal(signal.dedupe.isDuplicate, true);
  assert.equal(signal.dedupe.matchedPath, 'docs/CONTRACTS/_index.md');
});
