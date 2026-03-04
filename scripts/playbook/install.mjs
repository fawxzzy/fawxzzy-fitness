#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runDoctor } from './doctor.mjs';

const PLAYBOOK_NOTES_SCAFFOLD = `# Playbook Notes\n\nCapture reusable patterns, guardrails, failure modes, and decisions discovered while shipping this repository.\n\n## YYYY-MM-DD — <Title>\n- Type: Pattern | Guardrail | Failure Mode | Decision\n- Summary: <One-line reusable lesson>\n- Suggested Playbook File: Playbook/docs/<PATH>.md\n- Rationale: <Why this should become doctrine>\n- Evidence: <Files/PRs/incidents>\n- Status: Draft\n- Upstream: Local (pending PR)\n`;

const CHANGELOG_SCAFFOLD = `# Changelog\n\nAll notable changes to this project are documented in this file.\n`;

const PLAYBOOK_STATUS_SCAFFOLD = {
  schema_version: 1,
  repo: {
    name: null,
    branch: null,
    head_sha: null,
  },
  timestamps: {
    last_run_iso: null,
  },
  notes: {
    draft: 0,
    proposed: 0,
    promoted: 0,
  },
  contracts: {
    pass: 0,
    warn: 0,
    fail: 0,
  },
  signals: {
    autoClassified: 0,
    duplicatesSkipped: 0,
    boundaryFlags: 0,
  },
  recommended_next_action: '',
  reason: 'Bootstrap status initialized. Run npm run playbook to refresh.',
  commands: {
    run: 'npm run playbook',
    promote: 'npm run playbook:update',
    auto: 'npm run playbook:auto',
  },
};

const CODEX_SCAFFOLD = `# Codex Bootstrap\n\nAlways follow docs/PROJECT_GOVERNANCE.md.\n\nRequired reading before implementing changes:\n\n1. docs/PROJECT_GOVERNANCE.md\n2. docs/ARCHITECTURE.md (if present)\n3. docs/PLAYBOOK_CHECKLIST.md (if present)\n4. docs/playbook-status.json\n\nDevelopment loop:\n\nplan -> smallest diff -> implement -> npm run playbook:auto -> update docs/CHANGELOG.md when required\n\nKnowledge capture:\n\nif change introduces reusable principle/guardrail/pattern/failure mode, append to docs/PLAYBOOK_NOTES.md\n`;

const REQUIRED_PLAYBOOK_SCRIPTS = {
  'playbook:install': 'node scripts/playbook/install.mjs',
  'playbook:doctor': 'node scripts/playbook/doctor.mjs',
};

function ensureDir(relativePath) {
  const absolutePath = path.resolve(relativePath);
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
    return `OK   Created ${relativePath}`;
  }
  return `OK   ${relativePath} already exists`;
}

function ensureFile(relativePath, content) {
  const absolutePath = path.resolve(relativePath);
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, content, 'utf8');
    return `OK   Created ${relativePath}`;
  }
  return `OK   ${relativePath} already exists`;
}

function ensurePackageScripts() {
  const packagePath = path.resolve('package.json');
  const parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentScripts = parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {};

  let changed = false;
  for (const [name, command] of Object.entries(REQUIRED_PLAYBOOK_SCRIPTS)) {
    if (currentScripts[name] !== command) {
      currentScripts[name] = command;
      changed = true;
    }
  }

  if (!changed) {
    return 'OK   package.json playbook installer/doctor scripts already configured';
  }

  parsed.scripts = currentScripts;
  fs.writeFileSync(packagePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return 'OK   Updated package.json playbook installer/doctor scripts';
}

function warnIfPlaybookMissing() {
  const playbookDir = path.resolve('Playbook');
  if (fs.existsSync(playbookDir) && fs.statSync(playbookDir).isDirectory()) {
    return [];
  }

  return [
    'WARN Playbook/ is missing. No git commands were executed by installer.',
    'WARN Manual install options:',
    'WARN   git subtree add --prefix=Playbook https://github.com/ZachariahRedfield/Playbook.git main --squash',
    'WARN   # or',
    'WARN   git submodule add https://github.com/ZachariahRedfield/Playbook.git Playbook',
  ];
}

function main() {
  const logs = [];

  logs.push(ensureDir('docs'));
  logs.push(ensureFile('docs/PLAYBOOK_NOTES.md', PLAYBOOK_NOTES_SCAFFOLD));
  logs.push(ensureFile('docs/CHANGELOG.md', CHANGELOG_SCAFFOLD));
  logs.push(ensureFile('docs/playbook-status.json', `${JSON.stringify(PLAYBOOK_STATUS_SCAFFOLD, null, 2)}\n`));
  logs.push(ensureFile('CODEX.md', CODEX_SCAFFOLD));
  logs.push(ensurePackageScripts());

  const warnings = warnIfPlaybookMissing();

  for (const line of [...logs, ...warnings]) {
    console.log(line);
  }

  console.log('----');
  console.log('[playbook:install] Running doctor...');
  const doctorResult = runDoctor({ json: false });

  process.exit(doctorResult.status === 'FAIL' ? 1 : 0);
}

main();
