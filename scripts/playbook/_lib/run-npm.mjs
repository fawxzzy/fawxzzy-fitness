import { spawnSync } from 'node:child_process';

export function runNpm(args, opts = {}) {
  const bin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(bin, args, {
    stdio: 'inherit',
    shell: false,
    cwd: opts.cwd,
  });

  if (result.error) {
    console.error(`[playbook] Failed to spawn ${bin}: ${result.error.message}`);
    return { ok: false };
  }

  return {
    ok: result.status === 0,
    status: result.status,
  };
}
