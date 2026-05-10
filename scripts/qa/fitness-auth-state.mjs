import fs from "node:fs/promises";
import path from "node:path";
import {
  FITNESS_QA_EMAIL_ENV,
  FITNESS_QA_PASSWORD_ENV,
  NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV,
  NEXT_PUBLIC_SUPABASE_URL_ENV,
  buildSessionCookies,
  createAnonClient,
  ensureDirectoryForFile,
  formatUnixSecondsToIso,
  getOptionalEnv,
  getRequiredEnv,
  listMissingEnv,
  runtimeRoot,
} from "./fitness-qa-config.mjs";

export const FITNESS_APP_URL_ENV = "FITNESS_APP_URL";
export const FITNESS_ZAC_EMAIL_ENV = "FITNESS_ZAC_EMAIL";
export const FITNESS_ZAC_PASSWORD_ENV = "FITNESS_ZAC_PASSWORD";
export const QA_STORAGE_STATE_PATH = path.join(runtimeRoot, "qa-storage-state.json");
export const QA_AUTH_SUMMARY_PATH = path.join(runtimeRoot, "qa-auth-summary.json");
export const QA_LLEL_CAPTURE_ROOT = path.join(runtimeRoot, "llel-captures");
export const QA_LLEL_PROFILE_DIR = path.join(runtimeRoot, "llel-browser-profile");

export const PROTECTED_LLEL_ROUTES = [
  "/today",
  "/routines",
  "/history",
  "/history/progression",
  "/settings",
  "/dev/progression-audit",
];

export const LLEL_OPEN_ROUTES = [
  "/dev/env",
  "/dev/flags",
  "/dev/progression-scenarios",
  "/dev/progression-audit",
  "/today",
  "/routines",
  "/history",
  "/history/progression",
  "/settings",
];

export function resolveFitnessAppUrl() {
  return (getOptionalEnv(FITNESS_APP_URL_ENV) ?? "http://127.0.0.1:3002").replace(/\/$/, "");
}

export function resolveSupabaseAuthStorageKey() {
  const supabaseUrl = getRequiredEnv(NEXT_PUBLIC_SUPABASE_URL_ENV);
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) {
    throw new Error("Unable to resolve Supabase project ref for auth storage state.");
  }

  return `sb-${projectRef}-auth-token`;
}

function decodeJwtPayload(token) {
  const [, payload] = String(token).split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function getCookieValue(storageState, name) {
  const cookie = (storageState.cookies ?? []).find((entry) => entry?.name === name && typeof entry.value === "string");
  return cookie?.value ?? null;
}

export function ensureBrowserSupabaseStorageState(storageState, { baseUrl = resolveFitnessAppUrl() } = {}) {
  const authStorageKey = resolveSupabaseAuthStorageKey();
  const existingOrigin = (storageState.origins ?? []).find((origin) => origin.origin === baseUrl);
  const existingAuthEntry = existingOrigin?.localStorage?.some((entry) => entry.name === authStorageKey);
  if (existingAuthEntry) {
    return storageState;
  }

  const accessToken = getCookieValue(storageState, "sb-access-token");
  const refreshToken = getCookieValue(storageState, "sb-refresh-token");
  if (!accessToken || !refreshToken) {
    return storageState;
  }

  const jwtPayload = decodeJwtPayload(accessToken);
  const expiresAt = typeof jwtPayload?.exp === "number" ? jwtPayload.exp : null;
  const authStorageValue = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresAt ? Math.max(expiresAt - Math.floor(Date.now() / 1000), 0) : undefined,
    expires_at: expiresAt ?? undefined,
    refresh_token: refreshToken,
    user: {
      id: jwtPayload?.sub,
      aud: jwtPayload?.aud,
      role: jwtPayload?.role,
      email: jwtPayload?.email,
      app_metadata: jwtPayload?.app_metadata ?? {},
      user_metadata: jwtPayload?.user_metadata ?? {},
    },
  };

  const origins = (storageState.origins ?? []).filter((origin) => origin.origin !== baseUrl);
  return {
    ...storageState,
    origins: [
      ...origins,
      {
        origin: baseUrl,
        localStorage: [
          ...((existingOrigin?.localStorage ?? []).filter((entry) => entry.name !== authStorageKey)),
          {
            name: authStorageKey,
            value: JSON.stringify(authStorageValue),
          },
        ],
      },
    ],
  };
}

export function getAuthEnvReport({ account = "qa" } = {}) {
  const emailEnv = account === "zac" ? FITNESS_ZAC_EMAIL_ENV : FITNESS_QA_EMAIL_ENV;
  const passwordEnv = account === "zac" ? FITNESS_ZAC_PASSWORD_ENV : FITNESS_QA_PASSWORD_ENV;
  const required = [
    emailEnv,
    passwordEnv,
    NEXT_PUBLIC_SUPABASE_URL_ENV,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV,
  ];
  return {
    required,
    missing: listMissingEnv(required),
    baseUrl: resolveFitnessAppUrl(),
  };
}

function assertSuccess(error, message) {
  if (error) {
    throw new Error(`${message}: ${error.message ?? "Unknown Supabase error"}`);
  }
}

export function normalizeStorageCookie(cookie, baseUrl) {
  const url = new URL(baseUrl);
  const normalized = {
    name: cookie.name,
    value: cookie.value,
    domain: url.hostname,
    path: cookie.path ?? "/",
    httpOnly: Boolean(cookie.httpOnly),
    secure: Boolean(cookie.secure),
    sameSite: cookie.sameSite ?? "Lax",
  };
  if (Number.isFinite(cookie.expires)) {
    normalized.expires = cookie.expires;
  }
  return normalized;
}

export function buildCookieHeaderFromStorageState(storageState) {
  return (storageState.cookies ?? [])
    .filter((cookie) => cookie?.name && typeof cookie.value === "string")
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function fetchRouteWithStorageState(route, {
  baseUrl = resolveFitnessAppUrl(),
  storageStatePath = QA_STORAGE_STATE_PATH,
  redirect = "manual",
} = {}) {
  const storageState = JSON.parse(await fs.readFile(storageStatePath, "utf8"));
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      redirect,
      headers: {
        cookie: buildCookieHeaderFromStorageState(storageState),
      },
    });
    return {
      route,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      location: response.headers.get("location"),
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      route,
      status: "fetch_error",
      ok: false,
      location: null,
      finalUrl: `${baseUrl}${route}`,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function signInFitnessQaUser({ account = "qa" } = {}) {
  const report = getAuthEnvReport({ account });
  if (report.missing.length > 0) {
    throw new Error(`Missing required env for auth bootstrap: ${report.missing.join(", ")}.`);
  }

  const email = getRequiredEnv(account === "zac" ? FITNESS_ZAC_EMAIL_ENV : FITNESS_QA_EMAIL_ENV).toLowerCase();
  const password = getRequiredEnv(account === "zac" ? FITNESS_ZAC_PASSWORD_ENV : FITNESS_QA_PASSWORD_ENV);
  const anonClient = createAnonClient();
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  assertSuccess(error, "Unable to sign in as Fitness QA user");
  if (!data.session || !data.user) {
    throw new Error("Supabase sign-in did not return a session.");
  }
  return { email, session: data.session, user: data.user };
}

export async function writeAuthState({ email, session, user, baseUrl = resolveFitnessAppUrl() }) {
  const cookies = buildSessionCookies(session, baseUrl).map((cookie) => normalizeStorageCookie(cookie, baseUrl));
  const authStorageKey = resolveSupabaseAuthStorageKey();
  const authStorageValue = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user,
  };
  const storageState = ensureBrowserSupabaseStorageState({
    cookies,
    origins: [
      {
        origin: baseUrl,
        localStorage: [
          {
            name: authStorageKey,
            value: JSON.stringify(authStorageValue),
          },
        ],
      },
    ],
  }, { baseUrl });
  const createdAt = new Date().toISOString();
  const summary = {
    version: 1,
    createdAt,
    baseUrl,
    email,
    userId: user.id,
    expiresAt: formatUnixSecondsToIso(Number(session.expires_at ?? Number.NaN)),
    expiresAtEpochSeconds: session.expires_at ?? null,
    storageStatePath: QA_STORAGE_STATE_PATH,
    routes: PROTECTED_LLEL_ROUTES,
  };

  ensureDirectoryForFile(QA_STORAGE_STATE_PATH);
  await fs.writeFile(QA_STORAGE_STATE_PATH, `${JSON.stringify(storageState, null, 2)}\n`, "utf8");
  await fs.writeFile(QA_AUTH_SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { storageState, summary };
}

export async function checkProtectedRoutes({ routes = PROTECTED_LLEL_ROUTES, baseUrl = resolveFitnessAppUrl() } = {}) {
  const results = [];
  for (const route of routes) {
    results.push(await fetchRouteWithStorageState(route, { baseUrl }));
  }
  return {
    baseUrl,
    storageStatePath: QA_STORAGE_STATE_PATH,
    ok: results.every((result) => result.ok && result.status !== 307 && result.status !== 308),
    routes: results,
  };
}
