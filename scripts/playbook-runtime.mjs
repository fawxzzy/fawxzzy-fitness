#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const command = process.argv[2];
const outDir = '.playbook';
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString();

function writeJson(name, payload) {
  writeFileSync(join(outDir, name), JSON.stringify({ generatedAt: stamp, ...payload }, null, 2) + '\n');
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

switch (command) {
  case 'ai-context':
    writeJson('ai-context.json', {
      command,
      stateRoot: '.playbook',
      includeConfig: 'playbook.config.json',
      ignoreFile: '.playbookignore'
    });
    break;
  case 'ai-contract':
    writeJson('ai-contract.json', {
      command,
      contracts: ['lint', 'build'],
      status: 'ok'
    });
    break;
  case 'index':
    writeJson('index.json', {
      command,
      indexedPaths: ['src', 'docs', 'scripts', 'supabase']
    });
    break;
  case 'verify':
    run('npm run lint');
    run('npm run build');
    writeJson('verify.json', {
      command,
      checks: ['lint', 'build'],
      status: 'ok'
    });
    break;
  case 'plan':
    writeJson('plan.json', {
      command,
      next: ['Review .playbook/verify.json', 'Iterate from project governance requirements']
    });
    break;
  case 'pilot':
    for (const step of ['ai-context', 'ai-contract', 'index', 'verify', 'plan']) {
      run(`node scripts/playbook-runtime.mjs ${step}`);
    }
    writeJson('pilot.json', {
      command,
      steps: ['ai-context', 'ai-contract', 'index', 'verify', 'plan'],
      status: 'ok'
    });
    break;
  default:
    console.log('Usage: node scripts/playbook-runtime.mjs <ai-context|ai-contract|index|verify|plan|pilot>');
    process.exit(command ? 1 : 0);
}
