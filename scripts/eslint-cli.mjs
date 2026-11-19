import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRepoDependencies } from "./ensure-repo-deps.mjs";

// Next 16 removed `next lint`; this wrapper runs the ESLint CLI (flat config in eslint.config.mjs)
// the same way scripts/tsc-cli.mjs runs tsc.
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
await ensureRepoDependencies({
  repoRoot,
  reason: "eslint cli wrapper",
});
const require = createRequire(import.meta.url);
const eslintPackageJson = require.resolve("eslint/package.json");
const eslintBin = path.join(path.dirname(eslintPackageJson), require(eslintPackageJson).bin.eslint);

const child = spawn(process.execPath, [eslintBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
