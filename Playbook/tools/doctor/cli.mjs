#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const strict = argv.includes('--strict');
  const cwdArg = argv.find((arg) => arg.startsWith('--cwd='));
  const cwd = cwdArg ? path.resolve(cwdArg.slice('--cwd='.length)) : process.cwd();
  return { strict, cwd };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function commandForDisplay(args) {
  return args.map((part) => (part.includes(' ') ? `"${part}"` : part)).join(' ');
}

function runNpmScript({ cwd, script, extraArgs = [] }) {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = ['run', script, '--', ...extraArgs];
  const run = spawnSync(npmCmd, args, { cwd, encoding: 'utf8', shell: false });
  return { ...run, command: commandForDisplay([npmCmd, ...args]) };
}

function detectPlaybookRoot(targetCwd) {
  const candidates = [targetCwd, path.join(targetCwd, 'Playbook')];

  for (const candidate of candidates) {
    const engineCli = path.join(candidate, 'tools', 'engine', 'cli.mjs');
    const formatter = path.join(candidate, 'tools', 'engine', 'format-dashboard.mjs');
    if (fs.existsSync(engineCli) && fs.existsSync(formatter)) {
      return candidate;
    }
  }

  return null;
}

function findPreCommitHook(repoRoot) {
  const hooksPath = path.join(repoRoot, '.githooks', 'pre-commit');
  if (fs.existsSync(hooksPath)) return hooksPath;
  const gitHooksPath = path.join(repoRoot, '.git', 'hooks', 'pre-commit');
  if (fs.existsSync(gitHooksPath)) return gitHooksPath;
  return null;
}

function hasPlaybookCiWorkflow(repoRoot) {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowsDir)) return false;
  const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name));
  for (const file of workflowFiles.sort()) {
    const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
    if (content.includes('playbook') || content.includes('playbook-status.json')) {
      return true;
    }
  }
  return false;
}

function collectChecks(targetCwd) {
  const checks = [];
  const docsDir = path.join(targetCwd, 'docs');
  const notesPath = path.join(docsDir, 'PLAYBOOK_NOTES.md');
  const statusPath = path.join(docsDir, 'playbook-status.json');
  const trendPath = path.join(docsDir, 'playbook-trend.json');
  const packagePath = path.join(targetCwd, 'package.json');
  const configPath = path.join(targetCwd, 'tools', 'playbook', 'config.json');

  const playbookRoot = detectPlaybookRoot(targetCwd);
  const engineCliPath = playbookRoot ? path.join(playbookRoot, 'tools', 'engine', 'cli.mjs') : null;

  const nodeOk = Boolean(process.versions?.node);
  checks.push({
    name: 'node-runtime',
    status: nodeOk ? 'OK' : 'FAIL',
    message: nodeOk ? `Node ${process.versions.node} detected.` : 'Node runtime unavailable.',
    fixes: nodeOk ? [] : ['Install Node.js 20+ and re-run `npm run playbook:doctor`.']
  });

  const engineOk = Boolean(engineCliPath && fs.existsSync(engineCliPath));
  checks.push({
    name: 'engine-runnable',
    status: engineOk ? 'OK' : 'FAIL',
    message: engineOk
      ? `Engine scripts found at ${path.relative(targetCwd, engineCliPath) || 'tools/engine/cli.mjs'}.`
      : 'Playbook engine scripts not found in this repo or ./Playbook vendor path.',
    fixes: engineOk
      ? []
      : [
        'Vendor Playbook into ./Playbook (subtree/submodule) or run doctor from the Playbook repo root.',
        'Then add scripts with: node ./Playbook/tools/install/cli.mjs'
      ]
  });

  const notesExists = fs.existsSync(notesPath);
  checks.push({
    name: 'notes-doc',
    status: notesExists ? 'OK' : 'FAIL',
    message: notesExists ? 'docs/PLAYBOOK_NOTES.md exists.' : 'docs/PLAYBOOK_NOTES.md is missing.',
    fixes: notesExists ? [] : ['Create the notes file from template: cp Playbook/docs/TEMPLATES/consumer-docs/PLAYBOOK_NOTES.md docs/PLAYBOOK_NOTES.md']
  });

  const configExists = fs.existsSync(configPath);
  checks.push({
    name: 'repo-config',
    status: configExists ? 'OK' : 'WARN',
    message: configExists ? 'tools/playbook/config.json exists.' : 'tools/playbook/config.json is missing.',
    fixes: configExists ? [] : ['Generate config with installer: node ./Playbook/tools/install/cli.mjs']
  });

  let packageJson = null;
  if (fs.existsSync(packagePath)) {
    try {
      packageJson = readJson(packagePath);
    } catch (error) {
      checks.push({
        name: 'package-json',
        status: 'FAIL',
        message: `package.json could not be parsed: ${error.message}`,
        fixes: ['Fix package.json JSON syntax and rerun doctor.']
      });
    }
  } else {
    checks.push({
      name: 'package-json',
      status: 'FAIL',
      message: 'package.json is missing.',
      fixes: ['Initialize package.json: npm init -y']
    });
  }

  const scripts = packageJson?.scripts || {};
  for (const scriptName of ['playbook', 'playbook:status:ci']) {
    checks.push({
      name: `script-${scriptName}`,
      status: scripts[scriptName] ? 'OK' : 'FAIL',
      message: scripts[scriptName]
        ? `package.json script "${scriptName}" exists.`
        : `package.json script "${scriptName}" is missing.`,
      fixes: scripts[scriptName] ? [] : ['Run installer to add scripts: node ./Playbook/tools/install/cli.mjs']
    });
  }

  let statusExists = fs.existsSync(statusPath);
  let trendExists = fs.existsSync(trendPath);
  if ((!statusExists || !trendExists) && scripts.playbook) {
    const run = runNpmScript({ cwd: targetCwd, script: 'playbook', extraArgs: [`--cwd=${targetCwd}`] });
    statusExists = fs.existsSync(statusPath);
    trendExists = fs.existsSync(trendPath);
    checks.push({
      name: 'engine-generate-files',
      status: run.status === 0 ? 'OK' : 'WARN',
      message: run.status === 0
        ? `Executed ${run.command} to generate missing status/trend files.`
        : `Unable to auto-generate files with ${run.command}.`,
      fixes: run.status === 0 ? [] : [
        'Run playbook manually to inspect failure: npm run playbook -- --cwd=.',
        `Engine stderr: ${(run.stderr || '').trim().split(os.EOL).filter(Boolean).slice(-1)[0] || 'n/a'}`
      ]
    });
  }

  checks.push({
    name: 'status-file',
    status: statusExists ? 'OK' : 'FAIL',
    message: statusExists ? 'docs/playbook-status.json exists.' : 'docs/playbook-status.json is missing.',
    fixes: statusExists ? [] : ['Generate it: npm run playbook -- --cwd=.']
  });

  checks.push({
    name: 'trend-file',
    status: trendExists ? 'OK' : 'FAIL',
    message: trendExists ? 'docs/playbook-trend.json exists.' : 'docs/playbook-trend.json is missing.',
    fixes: trendExists ? [] : ['Generate it: npm run playbook -- --cwd=.']
  });

  const preCommitPath = findPreCommitHook(targetCwd);
  let preCommitMatches = false;
  if (preCommitPath) {
    const hookContent = fs.readFileSync(preCommitPath, 'utf8');
    preCommitMatches = hookContent.includes('npm run playbook') || hookContent.includes("['run', 'playbook']");

    if (!preCommitMatches) {
      const importMatch = hookContent.match(/import\s+['"](.+?)['"]/);
      if (importMatch) {
        const runnerPath = path.resolve(path.dirname(preCommitPath), importMatch[1]);
        if (fs.existsSync(runnerPath)) {
          const runnerContent = fs.readFileSync(runnerPath, 'utf8');
          preCommitMatches = runnerContent.includes('npm run playbook') || runnerContent.includes("['run', 'playbook']");
        }
      }
    }
  }
  checks.push({
    name: 'pre-commit-hook',
    status: preCommitPath && preCommitMatches ? 'OK' : 'WARN',
    message: preCommitPath
      ? (preCommitMatches ? `${path.relative(targetCwd, preCommitPath)} runs playbook (non-blocking expected).` : `${path.relative(targetCwd, preCommitPath)} exists but does not clearly run playbook.`)
      : 'No pre-commit hook detected.',
    fixes: preCommitPath && preCommitMatches ? [] : ['Install/update hook: node ./Playbook/tools/install/cli.mjs']
  });

  const ciGuidanceOk = hasPlaybookCiWorkflow(targetCwd);
  checks.push({
    name: 'ci-guidance',
    status: ciGuidanceOk ? 'OK' : 'WARN',
    message: ciGuidanceOk
      ? 'CI workflow includes playbook guidance/checks.'
      : 'No Playbook CI workflow guidance detected in .github/workflows.',
    fixes: ciGuidanceOk ? [] : ['Add CI step using Playbook/tools/install/CI_SNIPPET.md guidance.']
  });

  const hasLegacyScripts = fs.existsSync(path.join(targetCwd, 'scripts', 'playbook'));
  const migrationHints = [];
  if (hasLegacyScripts) {
    migrationHints.push(
      'Legacy scripts/playbook/* detected.',
      'Migrate scripts to central engine commands: npm run playbook / playbook:status:ci.',
      'After one green CI run, remove superseded scripts/playbook/* files.'
    );
  }

  return { checks, migrationHints, targetCwd };
}

function printReport(report, { strict = false } = {}) {
  const header = `Playbook Doctor Report (${report.targetCwd})`;
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const check of report.checks) {
    const label = check.status.padEnd(4, ' ');
    console.log(`[${label}] ${check.name} :: ${check.message}`);
    for (const fix of check.fixes) {
      console.log(`  -> ${fix}`);
    }
  }

  if (report.migrationHints.length > 0) {
    console.log('\nMigration hints:');
    for (const hint of report.migrationHints) {
      console.log(`  - ${hint}`);
    }
  }

  const summary = report.checks.reduce((acc, check) => {
    acc[check.status] += 1;
    return acc;
  }, { OK: 0, WARN: 0, FAIL: 0 });

  console.log(`\nSummary: OK=${summary.OK} WARN=${summary.WARN} FAIL=${summary.FAIL}${strict ? ' (strict mode)' : ''}`);

  if (summary.FAIL > 0) return 1;
  if (strict && summary.WARN > 0) return 1;
  return 0;
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const options = parseArgs(process.argv.slice(2));
  const report = collectChecks(options.cwd);
  process.exitCode = printReport(report, { strict: options.strict });
}

export { collectChecks, parseArgs, printReport };
