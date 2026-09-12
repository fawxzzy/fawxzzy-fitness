import { createHash, randomBytes } from "node:crypto";
import { optionalEnv, SUPABASE_URL } from "@/lib/env";
import { createFitnessHandoffSupabaseStore } from "@/lib/auth-handoff-supabase-store";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

export const FITNESS_HANDOFF_AUDIENCE = "fitness";
export const FITNESS_HANDOFF_BINDING_COOKIE = "__Host-fitness-handoff";
export const FITNESS_HANDOFF_ISSUER = "https://bxtcuhkotumitoqtrcej.supabase.co/auth/v1";
export const FITNESS_HANDOFF_MASTER_SUPABASE_URL = "https://bxtcuhkotumitoqtrcej.supabase.co";
export const FITNESS_HANDOFF_TTL_SECONDS = 60;
export const FITNESS_PORTAL_ORIGIN = "https://account.fawxzzy.com";

const FITNESS_HANDOFF_RUNTIME_ENABLED_ENV = "FITNESS_AUTH_HANDOFF_ENABLED";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

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

// Production stays closed until the migration owner installs the atomic RPC
// contract and proves the active Fitness runtime is bound to master Auth.
export function getFitnessHandoffRuntime(): FitnessHandoffRuntime | null {
  if (optionalEnv(FITNESS_HANDOFF_RUNTIME_ENABLED_ENV) !== "1") {
    return null;
  }

  const serviceRoleKey = optionalEnv(SUPABASE_SERVICE_ROLE_KEY_ENV);
  if (!serviceRoleKey) {
    return null;
  }

  try {
    const supabaseUrl = SUPABASE_URL();
    if (!isFitnessHandoffMasterUrl(supabaseUrl)) {
      return null;
    }

    return {
      now: () => Math.floor(Date.now() / 1000),
      store: createFitnessHandoffSupabaseStore(
        createFitnessSupabaseClient(supabaseUrl, serviceRoleKey, {
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
