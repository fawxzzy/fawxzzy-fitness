#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const OUTPUT_PATH = path.resolve('docs/contracts.json');

const contracts = [
  {
    id: 'no-server-imports-client',
    severity: 'fail',
    type: 'imports',
    description: 'Server modules must not import client-only modules.',
    forbid_imports: ['**/*.client.*', '**/*.client/**'],
    match_from: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['**/*.client.*', '**/*.client/**', '**/*.test.*', '**/*.spec.*'],
  },
  {
    id: 'client-cannot-import-playbook',
    severity: 'fail',
    type: 'imports',
    description: 'Runtime code must not import Playbook documentation or doctrine.',
    forbid_imports: ['Playbook/**'],
    match_from: ['src/**/*.ts', 'src/**/*.tsx'],
  },
  {
    id: 'prevent-playbook-runtime-import',
    severity: 'fail',
    type: 'imports',
    description: 'Application runtime code must never import from the Playbook directory.',
    forbid_imports: ['Playbook/**'],
    match_from: ['src/**'],
  },
  {
    id: 'changelog-discipline',
    severity: 'warn',
    type: 'repo',
    description: 'Changes to src/** should update docs/CHANGELOG.md.',
    ci_only: true,
  },
];

const payload = {
  schema_version: 1,
  contract_set_version: '0.1.0',
  generated_at_iso: new Date().toISOString(),
  sources: [
    {
      kind: 'playbook_doc',
      path: 'Playbook/docs',
    },
    {
      kind: 'repo_doc',
      path: 'docs',
    },
  ],
  contracts,
  exceptions: [],
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
