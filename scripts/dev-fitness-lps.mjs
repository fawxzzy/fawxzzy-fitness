import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const defaultLpsEnvFile = path.resolve(repoRoot, "..", "..", "secrets", "fitness-lps-dev.env");

const child = spawn(process.execPath, [
  "scripts/dev.mjs",
  "--hostname",
  "127.0.0.1",
  "--port",
  "3002",
], {
  env: {
    ...process.env,
    FITNESS_ENV_FILE: process.env.FITNESS_ENV_FILE || defaultLpsEnvFile,
    FITNESS_EXPECT_SUPABASE_HOST: "lpswxoyfniocuhljgzbc.supabase.co",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
