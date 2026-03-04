#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playbookRoot = path.resolve(__dirname, '..', '..');
const playbookPrefix = path.relative(cwd, playbookRoot) || '.';
const playbookPath = playbookPrefix === '.' ? './tools' : `./${playbookPrefix}/tools`;

const packageJsonPath = path.join(cwd, 'package.json');
const hookDir = path.join(cwd, '.githooks');
const hookPath = path.join(hookDir, 'pre-commit');
const runnerPath = path.join(hookDir, 'playbook-precommit.mjs');
const playbookConfigDir = path.join(cwd, 'tools', 'playbook');
const playbookConfigPath = path.join(playbookConfigDir, 'config.json');

function ensurePackageJson() {
  let pkg = { name: path.basename(cwd), private: true, scripts: {} };
  if (fs.existsSync(packageJsonPath)) {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.scripts ||= {};
  }

  pkg.scripts.playbook ||= `node ${playbookPath}/engine/cli.mjs run`;
  pkg.scripts['playbook:status'] ||= `node ${playbookPath}/engine/cli.mjs status`;
  pkg.scripts['playbook:status:ci'] ||= `node ${playbookPath}/engine/format-dashboard.mjs`;
  pkg.scripts['playbook:summary'] ||= `node ${playbookPath}/engine/pr-summary.mjs`;
  pkg.scripts['playbook:promote'] ||= `node ${playbookPath}/engine/cli.mjs promote`;
  pkg.scripts['playbook:contracts'] ||= `node ${playbookPath}/contracts-audit/cli.mjs`;
  pkg.scripts['playbook:doctor'] ||= `node ${playbookPath}/doctor/cli.mjs`;
  pkg.scripts.verify ||= 'npm run playbook';
  pkg.scripts['verify:strict'] ||= 'npm run playbook && npm run playbook:contracts';

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Updated scripts in ${packageJsonPath}`);
}

function installHook() {
  fs.mkdirSync(hookDir, { recursive: true });

  const hook = `#!/usr/bin/env node\nimport './playbook-precommit.mjs';\n`;
  fs.writeFileSync(hookPath, hook);
  fs.chmodSync(hookPath, 0o755);

  const runner = `import { spawnSync } from 'node:child_process';\n\nconst npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';\nconst run = spawnSync(npmCmd, ['run', 'playbook'], { stdio: 'inherit', shell: false });\nif (run.error) console.warn('[playbook hook] unable to run playbook:', run.error.message);\n\nfor (const file of ['docs/PLAYBOOK_NOTES.md', 'docs/playbook-status.json']) {\n  const stage = spawnSync('git', ['add', file], { stdio: 'ignore', shell: false });\n  if (stage.error) console.warn('[playbook hook] unable to auto-stage ' + file);\n}\n\nprocess.exit(0);\n`;

  fs.writeFileSync(runnerPath, runner);
  fs.chmodSync(runnerPath, 0o755);

  spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd, stdio: 'inherit', shell: false });
  console.log(`Installed non-blocking pre-commit hook at ${hookPath}`);
}

function ensurePlaybookConfig() {
  fs.mkdirSync(playbookConfigDir, { recursive: true });
  if (!fs.existsSync(playbookConfigPath)) {
    const template = {
      notesPath: 'docs/PLAYBOOK_NOTES.md',
      trendPath: 'docs/playbook-trend.json',
      thresholds: {
        draftToProposed: 3,
        proposedToPromoted: 5,
        promotedToContract: 3,
        missingFieldPolicy: 'warn'
      },
      contracts: {
        enabled: true,
        allowlistGlobs: [],
        exceptions: {}
      },
      guardian: {
        mode: 'default'
      }
    };
    fs.writeFileSync(playbookConfigPath, `${JSON.stringify(template, null, 2)}\n`);
    console.log(`Created ${playbookConfigPath}`);
  }
}

ensurePackageJson();
installHook();
ensurePlaybookConfig();

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const doctor = spawnSync(npmCmd, ['run', 'playbook:doctor', '--', `--cwd=${cwd}`], { cwd, stdio: 'inherit', shell: false });
if (doctor.error) {
  console.warn(`[playbook install] unable to run playbook doctor: ${doctor.error.message}`);
}

const ciSnippet = playbookPrefix === '.' ? 'tools/install/CI_SNIPPET.md' : `${playbookPrefix}/tools/install/CI_SNIPPET.md`;
console.log(`Playbook install complete. See ${ciSnippet} for CI wiring.`);
