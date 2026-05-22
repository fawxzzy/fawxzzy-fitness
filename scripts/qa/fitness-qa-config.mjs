import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import {
  assertExpectedFitnessSupabaseHost,
  assertSafeLocalSupabaseDev,
  parseDotenvFiles,
  resolveEnvFilePaths,
  resolveEnvFilePath,
} from "../env-file.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);

export const repoRoot = path.resolve(scriptDir, "..", "..");
export const atlasRoot = path.resolve(repoRoot, "..", "..");
export const envPaths = resolveEnvFilePaths(repoRoot);
export const envPath = resolveEnvFilePath(repoRoot);
export const runtimeRoot = path.join(atlasRoot, "runtime", "fitness");
export const captureRoot = path.join(atlasRoot, "tmp", "captures", "fitness", "qa-local-feedback");
export const sessionArtifactPath = path.join(runtimeRoot, "qa-session.json");
export const mobileLoopStatusPath = path.join(runtimeRoot, "mobile-loop-status.json");
export const devServerLogPath = path.join(runtimeRoot, "fitness-dev-server.log");
export const devServerErrorLogPath = path.join(runtimeRoot, "fitness-dev-server.err.log");
export const tunnelLogPath = path.join(runtimeRoot, "fitness-tunnel.log");
export const tunnelErrorLogPath = path.join(runtimeRoot, "fitness-tunnel.err.log");

export const FITNESS_QA_EMAIL_ENV = "FITNESS_QA_EMAIL";
export const FITNESS_QA_PASSWORD_ENV = "FITNESS_QA_PASSWORD";
export const FITNESS_QA_JUNK_USER_REGEX_ENV = "FITNESS_QA_JUNK_USER_REGEX";
export const HISTORY_QA_PREVIEW_ENABLED_ENV = "HISTORY_QA_PREVIEW_ENABLED";
export const NEXT_PUBLIC_SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
export const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
export const QA_SESSION_STALE_BUFFER_SECONDS = 300;
export const DEFAULT_QA_PORT = 3002;
export const DEFAULT_QA_HOST = "127.0.0.1";
export const DEFAULT_QA_LAN_HOST = "0.0.0.0";

let cachedEnv = null;

export const QA_BASELINE = {
  profileTimeZone: "America/New_York",
  routineId: "4c0df9ea-b277-4c44-9076-239291d1aa10",
  routineDayId: "de35f9b0-b73a-49cb-b3e3-032f4f6cf46d",
  routineDayExerciseIds: {
    squat: "38087e27-2743-41ef-af0f-a0d49b1b88ea",
    lunge: "7c4449e8-7288-4b62-8ddb-e4eefb3f9f6a",
    pullup: "b4ad5c48-2ff2-45b3-b1df-65f8f17a47f8",
  },
  sessionIds: {
    latest: "3a8fc306-9ad4-4c1d-bfad-55e66cb2ae1b",
    prior: "2d6e6ec7-8594-49d6-8b7e-e5750cb88df9",
  },
  sessionExerciseIds: {
    latestSquat: "dece93d0-b3ac-4400-b205-df34f822f413",
    latestLunge: "fb0c9af0-78c1-4128-8f94-c55ddb9f1d83",
    latestPullup: "f8b88e70-21e1-4dc9-aa7e-51e7bff9f8d0",
    priorSquat: "31bd6af7-5379-4750-914d-c8284f805fbf",
    priorPullup: "8ff5ef0c-0394-4739-b08d-e46949f1a9c4",
  },
  routineName: "Fitness QA Baseline",
  dayName: "QA Baseline Day",
  exercises: [
    {
      key: "squat",
      name: "Back Squat",
      targetSets: 4,
      targetRepsMin: 5,
      targetRepsMax: 5,
      targetWeight: 225,
      targetWeightUnit: "lbs",
      measurementType: "reps",
      defaultUnit: "reps",
    },
    {
      key: "lunge",
      name: "Walking Lunge",
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetWeight: 40,
      targetWeightUnit: "lbs",
      measurementType: "reps",
      defaultUnit: "reps",
    },
    {
      key: "pullup",
      name: "Weighted Pull-Up",
      targetSets: 3,
      targetRepsMin: 5,
      targetRepsMax: 6,
      targetWeight: 25,
      targetWeightUnit: "lbs",
      measurementType: "reps",
      defaultUnit: "reps",
    },
  ],
};

export function ensureDirectoryForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function getConfiguredQaPort() {
  const rawPort = getOptionalEnv("FITNESS_QA_DEV_PORT");
  const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : DEFAULT_QA_PORT;
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`FITNESS_QA_DEV_PORT must be a TCP port number. Received: ${rawPort}`);
  }

  return parsedPort;
}

export function getLanIPv4Addresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal || !entry.address) {
        continue;
      }

      if (entry.address.startsWith("169.254.")) {
        continue;
      }

      addresses.push(entry.address);
    }
  }

  return [...new Set(addresses)].sort((left, right) => {
    const leftPrivate = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(left);
    const rightPrivate = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(right);
    if (leftPrivate === rightPrivate) {
      return left.localeCompare(right);
    }

    return leftPrivate ? -1 : 1;
  });
}

export function resolveMobileLoopUrls({ port = getConfiguredQaPort(), tunnelUrl = null } = {}) {
  const lanUrls = getLanIPv4Addresses().map((address) => `http://${address}:${port}`);
  const configuredTunnelUrl = tunnelUrl ?? getOptionalEnv("FITNESS_QA_TUNNEL_URL");

  return {
    port,
    localUrl: `http://${DEFAULT_QA_HOST}:${port}`,
    bindUrl: `http://${DEFAULT_QA_LAN_HOST}:${port}`,
    primaryLanUrl: lanUrls[0] ?? null,
    lanUrls,
    tunnelUrl: configuredTunnelUrl ? configuredTunnelUrl.replace(/\/$/, "") : null,
  };
}

export function loadPinnedEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const fileEnv = parseDotenvFiles(envPaths);
  cachedEnv = {
    ...process.env,
    ...fileEnv,
  };
  assertSafeLocalSupabaseDev({
    env: cachedEnv,
    envFilePath: envPath,
    commandName: "fitness QA workflow",
  });
  assertExpectedFitnessSupabaseHost({
    env: cachedEnv,
    commandName: "fitness QA workflow",
  });

  return cachedEnv;
}

export function getOptionalEnv(name) {
  const value = loadPinnedEnv()[name];
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getRequiredEnv(name) {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`Set ${name} in ${envPath} or the current shell before running this QA workflow.`);
  }

  return value;
}

export function resolveBaseUrl() {
  const configured = getOptionalEnv("APP_URL") ?? getOptionalEnv("NEXT_PUBLIC_APP_URL");
  return (configured ?? `http://${DEFAULT_QA_HOST}:${DEFAULT_QA_PORT}`).replace(/\/$/, "");
}

export function hasOptionalEnv(name) {
  return getOptionalEnv(name) !== null;
}

export function listMissingEnv(names) {
  return names.filter((name) => !hasOptionalEnv(name));
}

export function getQaCredentials() {
  return {
    email: getRequiredEnv(FITNESS_QA_EMAIL_ENV).toLowerCase(),
    password: getRequiredEnv(FITNESS_QA_PASSWORD_ENV),
  };
}

export function createServiceRoleClient() {
  return createClient(
    getRequiredEnv(NEXT_PUBLIC_SUPABASE_URL_ENV),
    getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function createAnonClient() {
  return createClient(
    getRequiredEnv(NEXT_PUBLIC_SUPABASE_URL_ENV),
    getRequiredEnv(NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function formatDateInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDate(date, days) {
  return new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));
}

export function formatDateTimeInTimeZone(date, timeZone, hour, minute) {
  const datePart = formatDateInTimeZone(date, timeZone);
  const [year, month, day] = datePart.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
}

export function buildSessionCookies(session, baseUrl) {
  const secure = baseUrl.startsWith("https://");
  const expires = typeof session.expires_at === "number" ? session.expires_at : undefined;

  return [
    {
      name: "sb-access-token",
      value: session.access_token,
      url: baseUrl,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
      expires,
    },
    {
      name: "sb-refresh-token",
      value: session.refresh_token,
      url: baseUrl,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
      expires,
    },
  ];
}

export function formatUnixSecondsToIso(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) {
    return null;
  }

  return new Date(epochSeconds * 1000).toISOString();
}

export function getHistoryPreviewEnabled() {
  return getOptionalEnv(HISTORY_QA_PREVIEW_ENABLED_ENV) === "1";
}
