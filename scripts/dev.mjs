import fs from "node:fs";
import os from "node:os";
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
const middlewareManifestStub = JSON.stringify({
  version: 3,
  middleware: {},
  functions: {},
  sortedMiddleware: [],
}, null, 2);

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
const devArgs = process.argv.slice(2);

function readArgValue(names, fallback) {
  for (let index = 0; index < devArgs.length; index += 1) {
    const entry = devArgs[index];
    for (const name of names) {
      if (entry === name) {
        const next = devArgs[index + 1];
        return next && !next.startsWith("-") ? next : fallback;
      }

      if (entry.startsWith(`${name}=`)) {
        return entry.slice(name.length + 1);
      }
    }
  }

  return fallback;
}

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

function ensureMiddlewareManifestStub() {
  const serverDir = path.join(repoRoot, ".next", "server");
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

printLanHint();

const child = spawn(process.execPath, [nextBin, "dev", ...devArgs], {
  cwd: repoRoot,
  env: childEnv,
  stdio: "inherit",
});
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
