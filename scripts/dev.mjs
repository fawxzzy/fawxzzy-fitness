import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = path.join(repoRoot, ".env.local");
const DEV_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LEGACY_SUPABASE_URL",
  "LEGACY_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "HISTORY_QA_PREVIEW_ENABLED",
];

function parseDotenvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    entries[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }

  return entries;
}

const fileEnv = parseDotenvFile(envPath);
const childEnv = { ...process.env };
const overriddenKeys = [];

for (const key of DEV_ENV_KEYS) {
  const fileValue = fileEnv[key];
  if (typeof fileValue !== "string" || fileValue.length === 0) {
    continue;
  }

  if (process.env[key] && process.env[key] !== fileValue) {
    overriddenKeys.push(key);
  }

  childEnv[key] = fileValue;
}

if (overriddenKeys.length > 0) {
  process.stderr.write(
    `[dev] Overriding inherited env with ${path.basename(envPath)} for: ${overriddenKeys.join(", ")}\n`,
  );
}

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  cwd: repoRoot,
  env: childEnv,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
