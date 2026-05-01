import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  assertSafeLocalSupabaseDev,
  DEV_ENV_FILE_OVERRIDE_ENV,
  parseDotenvFile,
  resolveEnvFilePath,
} from "./env-file.mjs";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const DEV_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
];
const rawDevArgs = process.argv.slice(2);

function readArgValue(names, fallback, args = rawDevArgs) {
  for (let index = 0; index < args.length; index += 1) {
    const entry = args[index];
    for (const name of names) {
      if (entry === name) {
        const next = args[index + 1];
        return next && !next.startsWith("-") ? next : fallback;
      }

      if (entry.startsWith(`${name}=`)) {
        return entry.slice(name.length + 1);
      }
    }
  }

  return fallback;
}

function stripCustomArgs(args) {
  const sanitized = [];

  for (let index = 0; index < args.length; index += 1) {
    const entry = args[index];
    if (entry === "--env-file") {
      index += 1;
      continue;
    }

    if (entry.startsWith("--env-file=")) {
      continue;
    }

    sanitized.push(entry);
  }

  return sanitized;
}

const envPath = resolveEnvFilePath(repoRoot, readArgValue(["--env-file"], process.env[DEV_ENV_FILE_OVERRIDE_ENV] ?? ""));
const fileEnv = parseDotenvFile(envPath);
const childEnv = { ...process.env };
const overriddenKeys = [];
const devArgs = stripCustomArgs(rawDevArgs);

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

assertSafeLocalSupabaseDev({
  env: childEnv,
  envFilePath: envPath,
  commandName: "next dev",
});

if (overriddenKeys.length > 0) {
  process.stderr.write(
    `[dev] Overriding inherited env with ${path.basename(envPath)} for: ${overriddenKeys.join(", ")}\n`,
  );
}

const child = spawn(process.execPath, [nextBin, "dev", ...devArgs], {
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
