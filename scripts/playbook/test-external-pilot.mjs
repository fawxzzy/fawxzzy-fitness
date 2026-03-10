#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runPlaybook(rootDir, command) {
  const script = path.resolve('scripts/playbook/playbook-command.mjs');
  const result = spawnSync('node', [script, command], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`playbook ${command} failed: ${result.stderr || result.stdout}`);
  }

  return result;
}

function main() {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-external-'));
  fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({ name: 'external-app', private: true }, null, 2));
  fs.mkdirSync(path.join(fixtureDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'src', 'page.tsx'), 'export default function Page() { return null; }\n');
  fs.mkdirSync(path.join(fixtureDir, 'supabase'), { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'supabase', 'config.toml'), 'project_id = "external"\n');

  runPlaybook(fixtureDir, 'init');
  runPlaybook(fixtureDir, 'index');
  runPlaybook(fixtureDir, 'verify');

  const runtimePath = path.join(fixtureDir, '.playbook', 'runtime.json');
  const indexPath = path.join(fixtureDir, '.playbook', 'repo-index.json');
  const graphPath = path.join(fixtureDir, '.playbook', 'repo-graph.json');
  const verifyPath = path.join(fixtureDir, '.playbook', 'verify-findings.json');

  expect(fs.existsSync(runtimePath), 'runtime.json should exist');
  expect(fs.existsSync(indexPath), 'repo-index.json should exist');
  expect(fs.existsSync(graphPath), 'repo-graph.json should exist');
  expect(fs.existsSync(verifyPath), 'verify-findings.json should exist');

  const verifyResult = JSON.parse(fs.readFileSync(verifyPath, 'utf8'));
  expect(verifyResult.ok === true, 'verify should be ok in external mode');
  expect(Array.isArray(verifyResult.findings), 'verify findings should be an array');

  console.log('external pilot flow assertions passed');
}

try {
  main();
} catch (error) {
  console.error(error?.message || error);
  process.exit(1);
}
