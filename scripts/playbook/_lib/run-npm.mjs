import { spawnSync } from 'node:child_process';

export function runNpm(args, opts = {}) {
  const isWin = process.platform === 'win32';
  const bin = 'npm';
  const cwd = opts.cwd;
  const result = spawnSync(bin, args, {
    stdio: 'inherit',
    cwd,
    shell: isWin,
  });

  if (result.error) {
    console.error(`[playbook] Failed to run npm: ${result.error.message}`);
    return { ok: false };
  }

  return {
    ok: result.status === 0,
    status: result.status,
  };
}
