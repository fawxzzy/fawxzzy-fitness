import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const DEFAULT_DEV_ENV_FILE = ".env.local";
export const DEV_ENV_FILE_OVERRIDE_ENV = "FITNESS_ENV_FILE";
export const ALLOW_PROD_SUPABASE_IN_DEV_ENV = "ALLOW_PROD_SUPABASE_IN_DEV";
export const FITNESS_EXPECT_SUPABASE_HOST_ENV = "FITNESS_EXPECT_SUPABASE_HOST";
export const DEFAULT_EXPECTED_SUPABASE_HOST = "bxtcuhkotumitoqtrcej.supabase.co";
export const RETIRED_FITNESS_SUPABASE_HOST = "lpswxoyfniocuhljgzbc.supabase.co";

export function normalizeEnvValue(rawValue) {
  let normalized = rawValue
    .replace(/^\uFEFF+/, "")
    .replace(/(?:\\r|\\n)+$/g, "")
    .trim();

  if (
    (normalized.startsWith("\"") && normalized.endsWith("\""))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  return normalized
    .replace(/^\uFEFF+/, "")
    .replace(/(?:\\r|\\n)+$/g, "")
    .trim();
}

export function parseDotenvFile(filePath) {
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
    const rawValue = line.slice(separatorIndex + 1);
    entries[key] = normalizeEnvValue(rawValue);
  }

  return entries;
}

export function parseDotenvFiles(filePaths) {
  const mergedEntries = {};

  for (const filePath of filePaths) {
    const entries = parseDotenvFile(filePath);
    for (const [key, value] of Object.entries(entries)) {
      if (!(key in mergedEntries)) {
        mergedEntries[key] = value;
      }
    }
  }

  return mergedEntries;
}

export function mergeEnvFileWithShell({
  fileEnv,
  shellEnv,
  explicitEnvFileOverride = Boolean(shellEnv[DEV_ENV_FILE_OVERRIDE_ENV]?.trim()),
}) {
  const resolvedEnv = { ...shellEnv };

  for (const [key, value] of Object.entries(fileEnv)) {
    if (explicitEnvFileOverride || !resolvedEnv[key]) {
      resolvedEnv[key] = value;
    }
  }

  return resolvedEnv;
}

export function resolveEnvFilePaths(repoRoot, override = process.env[DEV_ENV_FILE_OVERRIDE_ENV] ?? "") {
  const requested = override.trim();
  if (!requested) {
    return [path.join(repoRoot, DEFAULT_DEV_ENV_FILE)];
  }

  return [path.isAbsolute(requested)
    ? path.normalize(requested)
    : path.join(repoRoot, requested)];
}

export function resolveEnvFilePath(repoRoot, override = process.env[DEV_ENV_FILE_OVERRIDE_ENV] ?? "") {
  return resolveEnvFilePaths(repoRoot, override)[0];
}

export function isTruthyEnvValue(rawValue) {
  return /^(1|true|yes|on)$/i.test((rawValue ?? "").trim());
}

export function resolveUrlHost(value) {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return "";
  }
}

function resolveExpectedSupabaseHost(rawValue) {
  const normalized = String(rawValue ?? "").trim().toLowerCase();
  return normalized || DEFAULT_EXPECTED_SUPABASE_HOST;
}

function looksLikeProductionEnvFile(filePath) {
  return path.basename(filePath).toLowerCase().includes("production");
}

export function assertSafeLocalSupabaseDev({
  env,
  envFilePath,
  commandName,
}) {
  if (!looksLikeProductionEnvFile(envFilePath)) {
    return;
  }

  if (isTruthyEnvValue(env[ALLOW_PROD_SUPABASE_IN_DEV_ENV] ?? process.env[ALLOW_PROD_SUPABASE_IN_DEV_ENV])) {
    return;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const appUrl = env.APP_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3000";
  const usageTarget = commandName ? ` for ${commandName}` : "";
  const dataTarget = supabaseUrl ? ` (${supabaseUrl})` : "";

  throw new Error(
    `Refusing to start${usageTarget} with ${path.basename(envFilePath)} while pointed at production-style data${dataTarget}. ` +
    `Set ${ALLOW_PROD_SUPABASE_IN_DEV_ENV}=1 to confirm that local actions may write to production data via ${appUrl}.`,
  );
}

export function assertExpectedFitnessSupabaseHost({
  env,
  commandName,
}) {
  const expectedHost = resolveExpectedSupabaseHost(env[FITNESS_EXPECT_SUPABASE_HOST_ENV]);
  const actualHost = resolveUrlHost(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "");
  const usageTarget = commandName ? ` for ${commandName}` : "";

  const hasRetiredTarget = [env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_URL].some((url) => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/\.$/, "") === RETIRED_FITNESS_SUPABASE_HOST;
    } catch {
      return false;
    }
  });
  if (hasRetiredTarget) {
    throw new Error(
      `Refusing to continue${usageTarget}: the legacy Fitness Supabase project is retired. ` +
      `Configure the shared master or an explicit local emulator before running this workflow.`,
    );
  }

  if (!expectedHost) {
    return;
  }

  if (!actualHost) {
    throw new Error(
      `Refusing to continue${usageTarget} without NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL. Expected Supabase host: ${expectedHost}.`,
    );
  }

  if (actualHost !== expectedHost) {
    throw new Error(
      `Refusing to continue${usageTarget} because Fitness is pointed at the wrong Supabase project. ` +
      `Expected ${expectedHost}, received ${actualHost}. ` +
      `Fix ${FITNESS_EXPECT_SUPABASE_HOST_ENV}, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_URL before running the local Fitness workflow.`,
    );
  }
}
