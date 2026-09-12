import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { optionalEnv, SUPABASE_URL } from "@/lib/env";
import { createFitnessHandoffSupabaseStore } from "@/lib/auth-handoff-supabase-store";
import { resolveSupabaseAdminCredential } from "@/lib/supabase/admin";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

export const FITNESS_HANDOFF_AUDIENCE = "fitness";
export const FITNESS_HANDOFF_BINDING_COOKIE = "__Host-fitness-handoff";
export const FITNESS_HANDOFF_ISSUER = "https://bxtcuhkotumitoqtrcej.supabase.co/auth/v1";
export const FITNESS_HANDOFF_MASTER_SUPABASE_URL = "https://bxtcuhkotumitoqtrcej.supabase.co";
export const FITNESS_HANDOFF_MASTER_PROJECT_REF = "bxtcuhkotumitoqtrcej";
export const FITNESS_HANDOFF_READINESS_CONTRACT_VERSION = "fitness.auth-handoff-readiness.v1";
export const FITNESS_HANDOFF_TTL_SECONDS = 60;
export const FITNESS_PORTAL_ORIGIN = "https://account.fawxzzy.com";

const FITNESS_HANDOFF_RUNTIME_ENABLED_ENV = "FITNESS_AUTH_HANDOFF_ENABLED";

const ALLOWED_RETURN_PATHS = new Set(["/", "/entry", "/today"]);
const BASE64_URL_32_BYTE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type HandoffCookieWriter = {
  set(name: string, value: string, options: {
    httpOnly: boolean;
    maxAge: number;
    path: string;
    sameSite: "lax";
    secure: boolean;
  }): unknown;
};

export type FitnessHandoffRecord = {
  audience: typeof FITNESS_HANDOFF_AUDIENCE;
  bindingDigest: string;
  expiresAt: number;
  handoffId: string;
  issuer: typeof FITNESS_HANDOFF_ISSUER;
  returnTo: string;
};

export type FitnessHandoffStore = {
  begin(record: FitnessHandoffRecord): Promise<boolean>;
  consume(args: {
    audience: typeof FITNESS_HANDOFF_AUDIENCE;
    bindingDigest: string;
    handoffId: string;
    issuer: typeof FITNESS_HANDOFF_ISSUER;
    now: number;
  }): Promise<Pick<FitnessHandoffRecord, "returnTo"> | null>;
};

export type FitnessHandoffRuntime = {
  now: () => number;
  store: FitnessHandoffStore;
};

export type FitnessHandoffReadiness = {
  authProjectRef: typeof FITNESS_HANDOFF_MASTER_PROJECT_REF;
  contractVersion: typeof FITNESS_HANDOFF_READINESS_CONTRACT_VERSION;
  handoffStore: "available";
  sourceCommit: string;
};

type FitnessHandoffReadinessEnvironment = {
  FITNESS_AUTH_HANDOFF_ANON_KEY_SHA256?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
};

export function normalizeFitnessHandoffReturnTo(value: unknown) {
  return typeof value === "string" && ALLOWED_RETURN_PATHS.has(value) ? value : "/entry";
}

export function createHandoffSecret() {
  return randomBytes(32).toString("base64url");
}

export function isHandoffSecret(value: string) {
  return BASE64_URL_32_BYTE_PATTERN.test(value);
}

export function digestHandoffSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("base64url");
}

export function digestHandoffBinding(binding: string) {
  return digestHandoffSecret(binding);
}

export function setFitnessHandoffBindingCookie(writer: HandoffCookieWriter, binding: string) {
  writer.set(FITNESS_HANDOFF_BINDING_COOKIE, binding, {
    httpOnly: true,
    maxAge: FITNESS_HANDOFF_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

export function clearFitnessHandoffBindingCookie(writer: HandoffCookieWriter) {
  writer.set(FITNESS_HANDOFF_BINDING_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

export function isFitnessHandoffMasterUrl(value: string) {
  return value === FITNESS_HANDOFF_MASTER_SUPABASE_URL;
}

function decodeCanonicalBase64UrlJson(segment: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    return null;
  }

  try {
    const bytes = Buffer.from(segment, "base64url");
    if (bytes.toString("base64url") !== segment) {
      return null;
    }
    const parsed = JSON.parse(bytes.toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isFitnessHandoffMasterAnonKey(
  value: string | undefined,
  expectedSha256: string | undefined,
  now: number,
) {
  if (!value || value.length > 4 * 1024 || !/^[0-9a-f]{64}$/.test(expectedSha256 ?? "")) {
    return false;
  }

  const actualDigest = Buffer.from(createHash("sha256").update(value, "utf8").digest("hex"), "utf8");
  const expectedDigest = Buffer.from(expectedSha256!, "utf8");
  if (!timingSafeEqual(actualDigest, expectedDigest)) {
    return false;
  }

  const segments = value.split(".");
  if (segments.length !== 3 || segments.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))) {
    return false;
  }

  try {
    const header = decodeCanonicalBase64UrlJson(segments[0]);
    const payload = decodeCanonicalBase64UrlJson(segments[1]);
    const signature = Buffer.from(segments[2], "base64url");
    return header?.alg === "HS256"
      && header.typ === "JWT"
      && payload?.iss === "supabase"
      && payload.ref === FITNESS_HANDOFF_MASTER_PROJECT_REF
      && payload.role === "anon"
      && Number.isInteger(payload.iat)
      && Number.isInteger(payload.exp)
      && (payload.iat as number) <= now
      && (payload.exp as number) > now
      && signature.length === 32
      && signature.toString("base64url") === segments[2];
  } catch {
    return false;
  }
}

export function getFitnessHandoffReadiness(
  runtime: FitnessHandoffRuntime | null,
  env: FitnessHandoffReadinessEnvironment = {
    FITNESS_AUTH_HANDOFF_ANON_KEY_SHA256: optionalEnv("FITNESS_AUTH_HANDOFF_ANON_KEY_SHA256") ?? undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? undefined,
    NEXT_PUBLIC_SUPABASE_URL: optionalEnv("NEXT_PUBLIC_SUPABASE_URL") ?? undefined,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: optionalEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA") ?? undefined,
    VERCEL_GIT_COMMIT_SHA: optionalEnv("VERCEL_GIT_COMMIT_SHA") ?? undefined,
  },
): FitnessHandoffReadiness | null {
  if (!runtime || typeof runtime.now !== "function" || typeof runtime.store?.begin !== "function" || typeof runtime.store?.consume !== "function") {
    return null;
  }

  let projectRef: string;
  try {
    const configuredUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    projectRef = configuredUrl.hostname.endsWith(".supabase.co")
      ? configuredUrl.hostname.slice(0, -".supabase.co".length)
      : "";
    if (configuredUrl.origin !== FITNESS_HANDOFF_MASTER_SUPABASE_URL || projectRef !== FITNESS_HANDOFF_MASTER_PROJECT_REF) {
      return null;
    }
  } catch {
    return null;
  }

  let now: number;
  try {
    now = runtime.now();
  } catch {
    return null;
  }
  if (
    !Number.isFinite(now)
    || !isFitnessHandoffMasterAnonKey(
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      env.FITNESS_AUTH_HANDOFF_ANON_KEY_SHA256,
      now,
    )
  ) {
    return null;
  }

  const sourceCandidates = [env.VERCEL_GIT_COMMIT_SHA, env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  if (
    sourceCandidates.length === 0
    || sourceCandidates.some((value) => !/^[0-9a-f]{40}$/.test(value))
    || new Set(sourceCandidates).size !== 1
  ) {
    return null;
  }

  return {
    authProjectRef: FITNESS_HANDOFF_MASTER_PROJECT_REF,
    contractVersion: FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
    handoffStore: "available",
    sourceCommit: sourceCandidates[0],
  };
}

// Production stays closed until the migration owner installs the atomic RPC
// contract and proves the active Fitness runtime is bound to master Auth.
export function getFitnessHandoffRuntime(): FitnessHandoffRuntime | null {
  if (optionalEnv(FITNESS_HANDOFF_RUNTIME_ENABLED_ENV) !== "1") {
    return null;
  }

  try {
    const supabaseUrl = SUPABASE_URL();
    if (!isFitnessHandoffMasterUrl(supabaseUrl)) {
      return null;
    }

    const adminCredential = resolveSupabaseAdminCredential();

    return {
      now: () => Math.floor(Date.now() / 1000),
      store: createFitnessHandoffSupabaseStore(
        createFitnessSupabaseClient(supabaseUrl, adminCredential, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }),
      ),
    };
  } catch {
    return null;
  }
}
