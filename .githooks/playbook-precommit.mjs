import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = spawnSync(npmCmd, ['run', 'playbook'], { stdio: 'inherit', shell: false });
if (run.error) console.warn('[playbook hook] unable to run playbook:', run.error.message);

for (const file of ['docs/PLAYBOOK_NOTES.md', 'docs/playbook-status.json']) {
  const stage = spawnSync('git', ['add', file], { stdio: 'ignore', shell: false });
  if (stage.error) console.warn('[playbook hook] unable to auto-stage ' + file);
}

process.exit(0);
