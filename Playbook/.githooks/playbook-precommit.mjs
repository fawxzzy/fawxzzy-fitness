import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = spawnSync(npmCmd, ['run', 'playbook'], { stdio: 'inherit', shell: false });
if (run.error) console.warn('[playbook hook] unable to run playbook:', run.error.message);

const stage = spawnSync('git', ['add', 'docs/PLAYBOOK_NOTES.md'], { stdio: 'ignore', shell: false });
if (stage.error) console.warn('[playbook hook] unable to auto-stage docs/PLAYBOOK_NOTES.md');

process.exit(0);
