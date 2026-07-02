import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  writeDevServerState,
} from "./next-workspace-guard.mjs";
import {
  assertExpectedFitnessSupabaseHost,
  assertSafeLocalSupabaseDev,
  DEFAULT_EXPECTED_SUPABASE_HOST,
  DEV_ENV_FILE_OVERRIDE_ENV,
  FITNESS_EXPECT_SUPABASE_HOST_ENV,
  parseDotenvFiles,
  resolveEnvFilePaths,
  resolveUrlHost,
  resolveEnvFilePath,
} from "./env-file.mjs";
import { ensureRepoDependencies } from "./ensure-repo-deps.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
await ensureRepoDependencies({
  repoRoot,
  reason: "fitness dev server",
});
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const DEV_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DISCORD_VERIFICATION_TOKEN_PEPPER",
  "DISCORD_VERIFICATION_BOT_SECRET",
  "DISCORD_PUBLIC_KEY",
  "DISCORD_BOT_TOKEN",
  "DISCORD_APPLICATION_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_VERIFY_CHANNEL_ID",
  "DISCORD_VERIFIED_ROLE_ID",
  "DISCORD_MEMBER_SYNC_SECRET",
  "DISCORD_BUG_REPORT_FORUM_CHANNEL_ID",
  "DISCORD_FEEDBACK_PANEL_CHANNEL_ID",
  "DISCORD_UPDATES_CHANNEL_ID",
  "LEGACY_SUPABASE_URL",
  "LEGACY_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID",
  "STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID",
  "STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE",
  "STRIPE_PRO_FOUNDING_PRICE_ID",
  "STRIPE_PRO_STANDARD_PRICE_ID",
  "STRIPE_PRO_ACTIVE_PRICE_MODE",
  "FITNESS_QA_EMAIL",
  "FITNESS_QA_PASSWORD",
  "FITNESS_ZAC_EMAIL",
  "FITNESS_ZAC_PASSWORD",
  "FITNESS_LOCAL_DEV_ENTRY_PATH",
  "FITNESS_LOCAL_DEV_ROUTINE_ID",
  "FITNESS_LOCAL_DEV_DAY_ID",
  "ALLOW_PROD_SUPABASE_IN_DEV",
  "HISTORY_QA_PREVIEW_ENABLED",
  FITNESS_EXPECT_SUPABASE_HOST_ENV,
];
const middlewareManifestStub = JSON.stringify({
  version: 3,
  middleware: {},
  functions: {},
  sortedMiddleware: [],
}, null, 2);
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

const envPaths = resolveEnvFilePaths(repoRoot, readArgValue(["--env-file"], process.env[DEV_ENV_FILE_OVERRIDE_ENV] ?? ""));
const envPath = resolveEnvFilePath(repoRoot, readArgValue(["--env-file"], process.env[DEV_ENV_FILE_OVERRIDE_ENV] ?? ""));
const fileEnv = parseDotenvFiles(envPaths);
const childEnv = { ...process.env };
const overriddenKeys = [];
const devArgs = stripCustomArgs(rawDevArgs);
const nextBuildRoot = path.resolve(repoRoot, childEnv.NEXT_DIST_DIR?.trim() || ".next");

function getLanIPv4Addresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal || !entry.address || entry.address.startsWith("169.254.")) {
        continue;
      }

      addresses.push(entry.address);
    }
  }

  return [...new Set(addresses)].sort();
}

function printLanHint() {
  const hostname = readArgValue(["--hostname", "-H"], "localhost");
  const port = readArgValue(["--port", "-p"], "3000");
  const bindsForLan = hostname === "0.0.0.0" || hostname === "::";

  if (!bindsForLan) {
    return;
  }

  const lanUrls = getLanIPv4Addresses().map((address) => `http://${address}:${port}`);
  process.stdout.write(
    [
      "[dev] LAN mode enabled.",
      `[dev] Local:   http://127.0.0.1:${port}`,
      ...lanUrls.map((url) => `[dev] Phone:   ${url}`),
      lanUrls.length === 0 ? "[dev] Phone:   no active LAN IPv4 address found" : null,
    ].filter(Boolean).join("\n") + "\n",
  );
}

function warnIfUnexpectedSupabaseHost(env) {
  const expectedHost = String(env[FITNESS_EXPECT_SUPABASE_HOST_ENV] || DEFAULT_EXPECTED_SUPABASE_HOST).trim().toLowerCase();
  const actualHost = resolveUrlHost(env.NEXT_PUBLIC_SUPABASE_URL || "");

  if (!expectedHost || actualHost === expectedHost) {
    process.stdout.write(`[dev-target] Supabase target: ${actualHost || "(missing)"}\n`);
    return;
  }

  process.stderr.write(
    [
      "",
      "[dev-target] WARNING: Fitness dev is not pointed at the expected Supabase project.",
      `[dev-target] Expected: ${expectedHost}`,
      `[dev-target] Actual:   ${actualHost || "(missing NEXT_PUBLIC_SUPABASE_URL)"}`,
      "[dev-target] Use `npm run dev:fitness:lps` or fix .env.local before smoke testing FIT work.",
      "",
    ].join("\n"),
  );
}

function ensureMiddlewareManifestStub() {
  const serverDir = path.join(nextBuildRoot, "server");
  const manifestPath = path.join(serverDir, "middleware-manifest.json");
  const hasRealMiddlewareSource = fs.existsSync(path.join(repoRoot, "middleware.ts"))
    || fs.existsSync(path.join(repoRoot, "middleware.js"))
    || fs.existsSync(path.join(repoRoot, "src", "middleware.ts"))
    || fs.existsSync(path.join(repoRoot, "src", "middleware.js"));

  if (hasRealMiddlewareSource || !fs.existsSync(serverDir) || fs.existsSync(manifestPath)) {
    return;
  }

  fs.writeFileSync(manifestPath, `${middlewareManifestStub}\n`, "utf8");
}

async function syncDevServerState(childPid) {
  if (!Number.isInteger(childPid)) {
    return;
  }

  const hostname = readArgValue(["--hostname", "-H"], "localhost");
  const port = Number.parseInt(readArgValue(["--port", "-p"], "3000"), 10);
  if (!Number.isInteger(port) || port <= 0) {
    return;
  }
  await writeDevServerState({
    repoRoot,
    pid: childPid,
    processName: "next-dev",
    executablePath: process.execPath,
    commandLine: [process.execPath, nextBin, "dev", ...devArgs].join(" "),
    hostname,
    port: Number.isInteger(port) ? port : null,
    startedAt: new Date().toISOString(),
    wrapperPid: process.pid,
  });
}

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
assertExpectedFitnessSupabaseHost({
  env: childEnv,
  commandName: "next dev",
});

if (overriddenKeys.length > 0) {
  process.stderr.write(
    `[dev] Overriding inherited env with ${path.basename(envPath)} for: ${overriddenKeys.join(", ")}\n`,
  );
}

printLanHint();
warnIfUnexpectedSupabaseHost(childEnv);

const child = spawn(process.execPath, [nextBin, "dev", ...devArgs], {
  cwd: repoRoot,
  env: childEnv,
  stdio: "inherit",
});
await syncDevServerState(child.pid ?? null);
const middlewareManifestInterval = setInterval(() => {
  try {
    ensureMiddlewareManifestStub();
  } catch (error) {
    process.stderr.write(`[dev] Failed to ensure middleware-manifest.json stub: ${String(error)}\n`);
  }
}, 750);

child.on("exit", (code, signal) => {
  clearInterval(middlewareManifestInterval);
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
