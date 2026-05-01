import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const DEFAULT_DEV_ENV_FILE = ".env.local";
export const DEV_ENV_FILE_OVERRIDE_ENV = "FITNESS_ENV_FILE";
export const ALLOW_PROD_SUPABASE_IN_DEV_ENV = "ALLOW_PROD_SUPABASE_IN_DEV";

export function normalizeEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
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

export function resolveEnvFilePath(repoRoot, override = process.env[DEV_ENV_FILE_OVERRIDE_ENV] ?? "") {
  const requested = override.trim();
  if (!requested) {
    return path.join(repoRoot, DEFAULT_DEV_ENV_FILE);
  }

  return path.isAbsolute(requested)
    ? path.normalize(requested)
    : path.join(repoRoot, requested);
}

export function isTruthyEnvValue(rawValue) {
  return /^(1|true|yes|on)$/i.test((rawValue ?? "").trim());
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
